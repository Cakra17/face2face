package main

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/pion/rtcp"
	"github.com/pion/webrtc/v3"
)

type Room struct {
	id     string
	mu     sync.RWMutex
	peers  map[string]*Peer
	tracks map[string]*webrtc.TrackLocalStaticRTP
}

func (r *Room) addPeer(p *Peer) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.peers[p.id] = p
	log.Printf("[INFO] peer %s is join the room %s", p.id, r.id)
}

func (r *Room) removePeer(p *Peer) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.removePeerLocked(p)
}

// removePeerLocked removes a peer assuming r.mu is already held.
func (r *Room) removePeerLocked(p *Peer) {
	delete(r.peers, p.id)
	p.Close()

	log.Printf("[INFO] peer %s is left the room %s", p.id, r.id)
}

func (r *Room) addTrack(tr *webrtc.TrackRemote) *webrtc.TrackLocalStaticRTP {
	r.mu.Lock()
	defer func() {
		r.mu.Unlock()
		r.Signal()
	}()

	trackLocal, err := webrtc.NewTrackLocalStaticRTP(tr.Codec().RTPCodecCapability, tr.ID(), tr.StreamID())
	if err != nil {
		panic(err)
	}

	r.tracks[tr.ID()] = trackLocal
	return trackLocal
}

func (r *Room) removeTrack(track *webrtc.TrackLocalStaticRTP) {
	r.mu.Lock()
	defer func() {
		r.mu.Unlock()
		r.Signal()
	}()

	delete(r.tracks, track.ID())
}

func (r *Room) dispatchKeyframe() {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, peer := range r.peers {
		for _, receiver := range peer.pc.GetReceivers() {
			if receiver.Track() == nil {
				continue
			}

			peer.pc.WriteRTCP([]rtcp.Packet{
				&rtcp.PictureLossIndication{
					MediaSSRC: uint32(receiver.Track().SSRC()),
				},
			})
		}
	}
}

func (r *Room) Signal() {
	r.mu.Lock()
	defer func() {
		r.mu.Unlock()
		r.dispatchKeyframe()
	}()

	attemptSync := func() (tryAgain bool) {
		for _, peer := range r.peers {
			if peer.pc.ConnectionState() == webrtc.PeerConnectionStateClosed {
				r.removePeerLocked(peer)
				return true
			}

			existingSenders := make(map[string]bool)

			for _, sender := range peer.pc.GetSenders() {
				if sender.Track() == nil {
					continue
				}

				existingSenders[sender.Track().ID()] = true

				if _, ok := r.tracks[sender.Track().ID()]; !ok {
					if err := peer.pc.RemoveTrack(sender); err != nil {
						return true
					}
				}
			}

			for _, reciever := range peer.pc.GetReceivers() {
				if reciever.Track() == nil {
					continue
				}

				existingSenders[reciever.Track().ID()] = true
			}

			for trackId := range r.tracks {
				if _, ok := existingSenders[trackId]; !ok {
					if _, err := peer.pc.AddTrack(r.tracks[trackId]); err != nil {
						return true
					}
				}
			}

			offer, err := peer.pc.CreateOffer(nil)
			if err != nil {
				return true
			}

			if err = peer.pc.SetLocalDescription(offer); err != nil {
				return true
			}

			offerString, err := json.Marshal(offer)
			if err != nil {
				log.Printf("Failed to marshal offer to json: %v", err)

				return true
			}

			log.Printf("Send offer to client: %v", offer)

			if err = peer.Send(Signal{
				Type: SignalOffer,
				Data: string(offerString),
			}); err != nil {
				return true
			}
		}
		return tryAgain
	}

	for syncAttempt := 0; ; syncAttempt++ {
		if syncAttempt == 25 {
			go func() {
				time.Sleep(time.Second * 3)
				r.Signal()
			}()

			return
		}

		if !attemptSync() {
			break
		}
	}
}

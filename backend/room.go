package main

import (
	"log"
	"sync"

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
	delete(r.peers, p.id)
	p.Close()
	log.Printf("[INFO] peer %s is left the room %s", p.id, r.id)
}

func (r *Room) Notify(peerId string, typ SignalType) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, peer := range r.peers {
		if peer.id != peerId {
			peer.Send(Signal{
				Type:   typ,
				PeerId: peerId,
				RoomId: r.id,
			})
		}
	}
}

func (r *Room) sendICE(p *Peer, i *webrtc.ICECandidate) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.peers[p.id]; ok {
		msg := Signal{
			Type: SignalICE,
			RoomId: r.id,
			PeerId: p.id,
			Candidate: i.ToJSON(),
		}

		p.Send(msg)
	}
}

func (r *Room) sendOffer(p *Peer, offer string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.peers[p.id]; ok {
		msg := Signal{
			Type: SignalOffer,
			RoomId: r.id,
			PeerId: p.id,
			SDP: offer,
		}

		p.Send(msg)
	}
}

func (r *Room) sendAnswer(p *Peer, answer webrtc.SessionDescription) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.peers[p.id]; ok {
		msg := Signal{
			Type: SignalAnswer,
			RoomId: r.id,
			PeerId: p.id,
			SDP: answer.SDP,
		}

		p.Send(msg)
	}
}

func (r *Room) AddTrackToAllPeers(trackLocal webrtc.TrackLocal, sourcePeerId string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, p := range r.peers {
		if p.id != sourcePeerId {
			p.pc.AddTrack(trackLocal)
		}
	}
}

func (r *Room) SubcribeToExistingTrack(newPeer *Peer) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, track := range r.tracks {
		newPeer.pc.AddTrack(track)
	}
}
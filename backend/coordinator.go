package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/pion/webrtc/v3"
)

type RoomManager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

func (rm *RoomManager) AddUserToRoom(roomId string, peer *Peer) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, ok := rm.rooms[roomId]; ok {
		room.addPeer(peer)

		config := webrtc.Configuration{
			ICEServers: []webrtc.ICEServer{
				{
					URLs: []string{
						"stun:stun.l.google.com:19302",
					},
				},
			},
		}

		pc, err := webrtc.NewPeerConnection(config)
		if err != nil {
			log.Printf("[ERROR] Failed to create peer connection, %s", err.Error())
		}
		peer.SetPeerConnection(pc)
		log.Printf("[INFO] peer connection established")

		// accept audio and video
		for _, typ := range []webrtc.RTPCodecType{webrtc.RTPCodecTypeVideo, webrtc.RTPCodecTypeAudio} {
			if _, err := peer.pc.AddTransceiverFromKind(typ, webrtc.RTPTransceiverInit{
				Direction: webrtc.RTPTransceiverDirectionRecvonly,
			}); err != nil {
				log.Printf("[ERROR] Failed to recieve audio/video, %s", err.Error())
				return
			}
		}

		room.SubcribeToExistingTrack(peer)

		peer.pc.OnConnectionStateChange(func(pcs webrtc.PeerConnectionState) {
			switch pcs {
			case webrtc.PeerConnectionStateFailed:
				if err := peer.pc.Close(); err != nil {
					log.Printf("[ERROR] Peer connection is failed, %s", err.Error())
				}
			case webrtc.PeerConnectionStateClosed:
				room.removePeer(peer)
				room.Notify(peer.id, SignalLeave)
			}
		})

		peer.pc.OnICECandidate(func(i *webrtc.ICECandidate) {
			if i == nil {
				log.Printf("[INFO] ICEGatheringState, connected")
				return
			}

			log.Println("Ice: ", i)
			room.sendICE(peer, i)
		})

		peer.pc.OnTrack(func(tr *webrtc.TrackRemote, r *webrtc.RTPReceiver) {
			log.Printf("Track added from peer: %s", peer.id)
			room.mu.Lock()
			for _, p := range room.peers {
				if p.id != peer.id {
					p.AddRemoteTrack(tr)
				}
			}
			room.mu.Unlock()

			trackLocal, err := webrtc.NewTrackLocalStaticRTP(
				tr.Codec().RTPCodecCapability,
				tr.ID(),
				tr.StreamID(),
			)
			if err != nil {
				return
			}

			room.tracks[tr.ID()] = trackLocal
			room.AddTrackToAllPeers(trackLocal, peer.id)

			buf := make([]byte, 1500)
			for {
				n, _, err := tr.Read(buf)
				if err != nil {
					return
				}
				trackLocal.Write(buf[:n])
			}
		})

		peer.pc.OnNegotiationNeeded(func() {
			offer, err := peer.pc.CreateOffer(nil)
			if err != nil {
				return
			}

			err = peer.pc.SetLocalDescription(offer)
			if err != nil {
				return
			}

			room.sendOffer(peer, offer.SDP)
		})
	}
}

func (rm *RoomManager) RemoveUserFromRoom(roomId string, peer *Peer) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, ok := rm.rooms[roomId]; ok {
		room.removePeer(peer)
	}
}

func (rm *RoomManager) GetOrCreateRoom(roomID string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if r, ok := rm.rooms[roomID]; ok {
		return r
	}

	r := &Room{
		id:     roomID,
		peers:  make(map[string]*Peer),
		tracks: make(map[string]*webrtc.TrackLocalStaticRTP),
	}
	rm.rooms[roomID] = r

	return r
}

func (rm *RoomManager) HandleWS(w http.ResponseWriter, r *http.Request) {
	// upgrade connection to websocket
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}

	ctx := r.Context()

	// first signal type must be join
	var msg Signal
	if err := wsjson.Read(ctx, conn, &msg); err != nil || msg.Type != SignalJoin {
		conn.Close(websocket.StatusPolicyViolation, "expected join")
		return
	}

	room := rm.GetOrCreateRoom(msg.RoomId)
	peer := NewPeer(msg.PeerId, conn, nil, ctx)
	rm.AddUserToRoom(room.id, peer)

	// handle every incoming message
	for {
		var wsMsg Signal
		if err := wsjson.Read(ctx, conn, &wsMsg); err != nil {
			break
		}

		switch wsMsg.Type {
		case SignalOffer:
			if room, ok := rm.rooms[msg.RoomId]; ok {
				if peer, ok := room.peers[msg.PeerId]; ok {
					answer, err := peer.HandleOffer(wsMsg)
					if err != nil {
						log.Printf("[ERROR] %s", err.Error())
						return
					}
					room.sendAnswer(peer, answer)
				}
			}
		case SignalAnswer:
			if room, ok := rm.rooms[msg.RoomId]; ok {
				if peer, ok := room.peers[msg.PeerId]; ok {
					err := peer.HandleAnswer(msg.SDP)
					if err != nil {
						log.Printf("[ERROR] %s", err.Error())
						return
					}
				}
			}
		case SignalICE:
			if room, ok := rm.rooms[msg.RoomId]; ok {
				if peer, ok := room.peers[msg.PeerId]; ok {
					err := peer.HandleICE(msg.Candidate)
					if err != nil {
						log.Printf("[ERROR] %s", err.Error())
						return
					}
				}
			}
		case SignalLeave:
			rm.RemoveUserFromRoom(wsMsg.RoomId, peer)
		default:
			log.Println("Unknown signal type")
		}
	}
}

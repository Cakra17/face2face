package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/pion/rtp"
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

func (rm *RoomManager) AddUserToRoom(room *Room, peer *Peer) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

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

	peer.pc.OnConnectionStateChange(func(pcs webrtc.PeerConnectionState) {
		switch pcs {
		case webrtc.PeerConnectionStateClosed:
			room.Signal()
		case webrtc.PeerConnectionStateFailed:
			if err := peer.pc.Close(); err != nil {
				log.Printf("[ERROR] Peer connection is failed, %s", err.Error())
			}
		}
	})

	peer.pc.OnICECandidate(func(i *webrtc.ICECandidate) {
		if i == nil {
			log.Printf("[INFO] ICEGatheringState, connected")
			return
		}

		candidateString, err := json.Marshal(i.ToJSON())
		if err != nil {
			return
		}

		log.Println("[INFO] Ice: ", i)
		if err := peer.Send(Signal{
			Type: SignalCandidate,
			Data: string(candidateString),
		}); err != nil {
			log.Printf("[ERROR] Failed to send candidate: %v", err)
		}
	})

	peer.pc.OnICEConnectionStateChange(func(is webrtc.ICEConnectionState) {
		log.Printf("ICE connection state changed: %s", is)
	})

	peer.pc.OnTrack(func(tr *webrtc.TrackRemote, r *webrtc.RTPReceiver) {
		log.Printf("Track added from peer: %s", peer.id)

		trackLocal := room.addTrack(tr)
		defer room.removeTrack(trackLocal)

		buffer := make([]byte, 1500)
		rtpPac := &rtp.Packet{}

		for {
			i, _, err := tr.Read(buffer)
			if err != nil {
				return
			}

			if err := rtpPac.Unmarshal(buffer[:i]); err != nil {
				log.Printf("Failed to unmarshal incoming RTP packet: %v", err)
				return
			}

			rtpPac.Extension = false
			rtpPac.Extensions = nil

			if err := trackLocal.WriteRTP(rtpPac); err != nil {
				log.Printf("Failed to write RTP packet: %v", err)
				return
			}
		}
	})
}

func (rm *RoomManager) RemoveUserFromRoom(roomId string, peer *Peer) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, ok := rm.rooms[roomId]; ok {
		room.removePeer(peer)
	}
}

func (rm *RoomManager) GetPeerAndRoom(peerId string, roomId string) (*Peer, *Room) {
	room, ok := rm.rooms[roomId]
	if !ok {
		return nil, nil
	}

	peer, ok := room.peers[peerId]
	if !ok {
		return nil, nil
	}
	return peer, room
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

// DispatchKeyframes requests a keyframe for every room's peers. Safe to call
// periodically from a ticker goroutine.
func (rm *RoomManager) DispatchKeyframes() {
	rm.mu.RLock()
	rooms := make([]*Room, 0, len(rm.rooms))
	for _, r := range rm.rooms {
		rooms = append(rooms, r)
	}
	rm.mu.RUnlock()

	for _, r := range rooms {
		r.dispatchKeyframe()
	}
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
	rm.AddUserToRoom(room, peer)
	defer room.removePeer(peer)
	room.Signal()

	// handle every incoming message
	for {
		var wsMsg Signal
		if err := wsjson.Read(ctx, conn, &wsMsg); err != nil {
			break
		}

		switch wsMsg.Type {
		case SignalAnswer:
			answer := webrtc.SessionDescription{}
			if err := json.Unmarshal([]byte(wsMsg.Data), &answer); err != nil {
				return
			}
			log.Printf("Got answer: %v", answer)
			if err := peer.pc.SetRemoteDescription(answer); err != nil {
				return
			}

		case SignalCandidate:
			candidate := webrtc.ICECandidateInit{}
			if err := json.Unmarshal([]byte(wsMsg.Data), &candidate); err != nil {
				return
			}
			if err := peer.pc.AddICECandidate(candidate); err != nil {
				return
			}
		case SignalLeave:
			rm.RemoveUserFromRoom(wsMsg.RoomId, peer)
		default:
			log.Println("Unknown signal type")
		}
	}
}

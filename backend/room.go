package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/pion/webrtc/v3"
)

type Room struct {
	mu    sync.RWMutex
	peers map[string]*Peer
}

type RoomManager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

func (rm *RoomManager) GetOrCreateRoom(roomID string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if r, ok := rm.rooms[roomID]; ok {
		return r
	}

	r := &Room{
		peers: make(map[string]*Peer),
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
	peer := &Peer{
		conn: conn,
		ctx:  ctx,
		ID:   msg.PeerId,
	}

	// handle every incoming message
	for {
		var msg Signal
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			break
		}

		switch msg.Type {
		case "offer":
			handleOffer(peer, room, msg)
		case "answer":
			handleAnswer(peer, msg)
		case "ice":
			handleICE(peer, msg)
		}
	}

	room.removePeer(peer)
}

func handleOffer(peer *Peer, room *Room, msg Signal) {
	// 1. Create WebRTC Peer Connection
	// set a webrtc configuration
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{
					//"stun:stun.l.google.com:19305",
					"stun:stun.l.google.com:19302",
				},
			},
		},
	}

	pc, err := webrtc.NewAPI().NewPeerConnection(config)
	if err != nil {
		log.Printf("Failed to create peer connection, %s", err.Error())
		return
	}

	// attach Peer Connection to the peer
	peer.pc = pc

	// 2. register OnICECandidate - fires async as candidates are discovered
	pc.OnICECandidate(func(i *webrtc.ICECandidate) {
		if i == nil {
			// nil means gathering is complete, nothing to send
			return
		}

		candidate := i.ToJSON()

		// fire immediately as each candidate is discovered
		if err := peer.Send(Signal{
			Type:      SignalICE,
			Candidate: &candidate,
		}); err != nil {
			log.Println("failed to send ICE candidate:", err)
		}
	})

	// 3. register OnTrack — fires when browser's media arrives
	pc.OnTrack(func(tr *webrtc.TrackRemote, r *webrtc.RTPReceiver) {
		log.Printf("track received from peer %s: %s\n", peer.ID, tr.Kind())
		room.addPeer(peer)
		go forwardTrack(tr, peer, room)
	})

	// 4. register OnNegotiationNeeded — fires when AddTrack triggers renegotiation
	pc.OnNegotiationNeeded(func() {
		offer, err := peer.pc.CreateOffer(nil)
		if err != nil {
			log.Println("renegotiation offer failed:", err)
			return
		}

		if err := peer.pc.SetLocalDescription(offer); err != nil {
			log.Println("set local description failed:", err)
			return
		}

		peer.Send(Signal{
			Type: SignalOffer,
			SDP:  offer.SDP,
		})
	})

	// 5. register OnConnectionStateChange — fires when peer disconnects
	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("peer %s state: %s\n", peer.ID, state)
		switch state {
		case webrtc.PeerConnectionStateDisconnected,
			webrtc.PeerConnectionStateFailed:
			room.removePeer(peer)
		}
	})

	// 6. set the browser's offer as remote description
	if err = pc.SetRemoteDescription(webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  msg.SDP,
	}); err != nil {
		log.Printf("Failed to Set Remote Description, %s", err.Error())
		pc.Close()
		return
	}

	// 7. create an answer
	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		log.Printf("Failed to Create the answer, %s", err.Error())
		pc.Close()
		return
	}

	// 8. set local description (starts ICE gathering)
	err = pc.SetLocalDescription(answer)
	if err != nil {
		log.Printf("Failed to set local description, %s", err.Error())
		pc.Close()
		return
	}

	// 9. send answer back to browser
	if err := peer.Send(Signal{
		Type: SignalAnswer,
		SDP:  answer.SDP,
	}); err != nil {
		log.Println("send answer failed:", err)
	}
}

func handleAnswer(peer *Peer, msg Signal) {
	if err := peer.pc.SetLocalDescription(webrtc.SessionDescription{
		Type: webrtc.SDPTypeAnswer,
		SDP:  msg.SDP,
	}); err != nil {
		log.Println("handleAnswer failed:", err)
	}
}

func handleICE(peer *Peer, msg Signal) {
	if msg.Candidate == nil {
		return
	}

	if err := peer.pc.AddICECandidate(*msg.Candidate); err != nil {
		log.Println("handleICE failed:", err)
	}
}

func (r *Room) addPeer(p *Peer) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.peers[p.ID] = p
}

func (r *Room) removePeer(p *Peer) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.peers, p.ID)
	p.Close()
}

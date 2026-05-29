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

func (rm *RoomManager) GetOrCreateRoom(roomID string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if r, ok := rm.rooms[roomID]; ok {
		return r
	}

	r := &Room{
		peers: make(map[string]*Peer),
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

	//room := rm.GetOrCreateRoom(msg.RoomId)
	//peer := NewPeer(msg.PeerId, conn, nil, ctx)	

	// handle every incoming message
	for {
		var msg Signal
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			break
		}

		// TODO
		switch msg.Type {
		case SignalOffer:
		case SignalAnswer:
		case SignalICE:
		case SignalLeave:
		case SignalJoin:
		default:
			log.Println("Unknown signal type")
		}
	}
}
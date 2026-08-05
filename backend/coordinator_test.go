package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/pion/webrtc/v3"
)

func newTestRoomManager(t *testing.T) *RoomManager {
	t.Helper()
	return NewRoomManager()
}

func TestNewRoomManager(t *testing.T) {
	t.Parallel()

	rm := NewRoomManager()
	if rm == nil {
		t.Fatal("NewRoomManager returned nil")
	}
	if rm.rooms == nil {
		t.Fatal("rooms map is nil")
	}
	if len(rm.rooms) != 0 {
		t.Errorf("room count = %d, want 0", len(rm.rooms))
	}
}

func TestRoomManager_GetOrCreateRoom(t *testing.T) {
	t.Parallel()

	t.Run("creates new room", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		r := rm.GetOrCreateRoom("room-a")
		if r == nil {
			t.Fatal("GetOrCreateRoom returned nil")
		}
		if r.id != "room-a" {
			t.Errorf("room id = %q, want %q", r.id, "room-a")
		}
		if got, ok := rm.rooms["room-a"]; !ok || got != r {
			t.Error("created room not stored in manager")
		}
	})

	t.Run("returns same instance on repeat", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		r1 := rm.GetOrCreateRoom("room-a")
		r2 := rm.GetOrCreateRoom("room-a")
		if r1 != r2 {
			t.Error("GetOrCreateRoom returned different instances for the same id")
		}
		if len(rm.rooms) != 1 {
			t.Errorf("room count = %d, want 1", len(rm.rooms))
		}
	})

	t.Run("distinct ids yield distinct rooms", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		r1 := rm.GetOrCreateRoom("room-a")
		r2 := rm.GetOrCreateRoom("room-b")
		if r1 == r2 {
			t.Error("distinct ids returned the same room")
		}
		if len(rm.rooms) != 2 {
			t.Errorf("room count = %d, want 2", len(rm.rooms))
		}
	})
}

func TestRoomManager_GetPeerAndRoom(t *testing.T) {
	t.Parallel()

	t.Run("unknown room returns nil", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		p, r := rm.GetPeerAndRoom("p", "nope")
		if p != nil || r != nil {
			t.Error("expected nil peer and room for unknown room")
		}
	})

	t.Run("unknown peer returns nil", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		rm.GetOrCreateRoom("room-a")

		p, r := rm.GetPeerAndRoom("missing", "room-a")
		if p != nil || r != nil {
			t.Error("expected nil peer and room for unknown peer")
		}
	})

	t.Run("found returns peer and room", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		room := rm.GetOrCreateRoom("room-a")
		peer := newTestPeer(t, nil)
		room.addPeer(peer)

		gotPeer, gotRoom := rm.GetPeerAndRoom(peer.id, "room-a")
		if gotPeer != peer {
			t.Error("returned peer does not match")
		}
		if gotRoom != room {
			t.Error("returned room does not match")
		}
	})
}

func TestRoomManager_RemoveUserFromRoom(t *testing.T) {
	t.Parallel()

	t.Run("removes peer from existing room", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		room := rm.GetOrCreateRoom("room-a")
		p, _ := newTestPeerWithConn(t)
		room.addPeer(p)

		rm.RemoveUserFromRoom("room-a", p)

		if _, ok := room.peers[p.id]; ok {
			t.Error("peer still in room after remove")
		}
		if got := p.pc.ConnectionState(); got != webrtc.PeerConnectionStateClosed {
			t.Errorf("pc state = %v, want %v", got, webrtc.PeerConnectionStateClosed)
		}
	})

	t.Run("unknown room is a no-op", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		p, _ := newTestPeerWithConn(t)

		rm.RemoveUserFromRoom("nope", p)
	})
}

func TestRoomManager_DispatchKeyframes(t *testing.T) {
	t.Parallel()

	t.Run("empty manager is a no-op", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		rm.DispatchKeyframes()
	})

	t.Run("rooms with peers but no tracks is a no-op", func(t *testing.T) {
		t.Parallel()

		rm := newTestRoomManager(t)
		room := rm.GetOrCreateRoom("room-a")
		room.addPeer(newTestPeer(t, nil))

		rm.DispatchKeyframes()
	})
}

func TestRoomManager_AddUserToRoom(t *testing.T) {
	t.Parallel()

	rm := newTestRoomManager(t)
	room := rm.GetOrCreateRoom("room-a")

	peer := NewPeer("peer-1", nil, nil, context.Background())
	rm.AddUserToRoom(room, peer)

	t.Cleanup(func() {
		if peer.pc == nil {
			return
		}
		room.mu.Lock()
		delete(room.peers, peer.id)
		room.mu.Unlock()
		_ = peer.pc.Close()
	})

	if _, ok := room.peers[peer.id]; !ok {
		t.Error("peer was not added to the room")
	}
	if peer.pc == nil {
		t.Fatal("AddUserToRoom did not set peer.pc")
	}

	transceivers := peer.pc.GetTransceivers()
	if len(transceivers) != 2 {
		t.Fatalf("transceiver count = %d, want 2 (video + audio)", len(transceivers))
	}
	for _, tr := range transceivers {
		if tr.Direction() != webrtc.RTPTransceiverDirectionRecvonly {
			t.Errorf("transceiver direction = %v, want %v",
				tr.Direction(), webrtc.RTPTransceiverDirectionRecvonly)
		}
	}
}

func TestRoomManager_HandleWS_RejectsNonJoin(t *testing.T) {
	t.Parallel()

	rm := newTestRoomManager(t)
	srv := httptest.NewServer(http.HandlerFunc(rm.HandleWS))
	t.Cleanup(srv.Close)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, srv.URL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	if err := wsjson.Write(ctx, conn, Signal{Type: SignalOffer}); err != nil {
		t.Fatalf("write signal: %v", err)
	}

	if _, _, err := conn.Read(ctx); err == nil {
		t.Fatal("expected connection to be closed, got nil error")
	} else if got := websocket.CloseStatus(err); got != websocket.StatusPolicyViolation {
		t.Errorf("close status = %v, want %v", got, websocket.StatusPolicyViolation)
	}
}

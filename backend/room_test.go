package main

import (
	"context"
	"testing"

	"github.com/coder/websocket"
	"github.com/pion/webrtc/v3"
)

func newTestRoom(t *testing.T) *Room {
	t.Helper()

	return &Room{
		id:     testRoomID,
		peers:  make(map[string]*Peer),
		tracks: make(map[string]*webrtc.TrackLocalStaticRTP),
	}
}

func newTestPeerWithConn(t *testing.T) (*Peer, *websocket.Conn) {
	t.Helper()

	serverConn, clientConn := newWebSocketPair(t)
	p := newTestPeer(t, clientConn)

	go func() {
		_, _, _ = serverConn.Read(context.Background())
	}()

	return p, serverConn
}

func newTestTrack(t *testing.T, id string) *webrtc.TrackLocalStaticRTP {
	t.Helper()

	track, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
		id,
		"stream-"+id,
	)
	if err != nil {
		t.Fatalf("create track: %v", err)
	}
	return track
}

func TestRoom_AddPeer(t *testing.T) {
	t.Parallel()

	t.Run("stores peer in room", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		p := newTestPeer(t, nil)

		r.addPeer(p)

		got, ok := r.peers[p.id]
		if !ok {
			t.Errorf("peer %s not in room", p.id)
		}
		if got != p {
			t.Errorf("stored peer mismatch: got %p, want %p", got, p)
		}
	})

	t.Run("adds multiple distinct peers", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		p1 := newTestPeer(t, nil)
		p1.id = "peer-a"
		p2 := newTestPeer(t, nil)
		p2.id = "peer-b"

		r.addPeer(p1)
		r.addPeer(p2)

		if len(r.peers) != 2 {
			t.Errorf("peer count = %d, want 2", len(r.peers))
		}
		if _, ok := r.peers[p1.id]; !ok {
			t.Errorf("peer %s not in room", p1.id)
		}
		if _, ok := r.peers[p2.id]; !ok {
			t.Errorf("peer %s not in room", p2.id)
		}
	})

	t.Run("re-adding same id overwrites", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		original := newTestPeer(t, nil)
		replacement := newTestPeer(t, nil)

		r.addPeer(original)
		r.addPeer(replacement)

		if len(r.peers) != 1 {
			t.Errorf("peer count = %d, want 1", len(r.peers))
		}
		if r.peers[original.id] != replacement {
			t.Error("peer was not overwritten by replacement")
		}
	})
}

func TestRoom_RemovePeer(t *testing.T) {
	t.Parallel()

	t.Run("removes and closes peer", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		p, _ := newTestPeerWithConn(t)

		r.addPeer(p)
		r.removePeer(p)

		if _, ok := r.peers[p.id]; ok {
			t.Errorf("peer %s still in room after remove", p.id)
		}
		if got := p.pc.ConnectionState(); got != webrtc.PeerConnectionStateClosed {
			t.Errorf("pc state = %v, want %v", got, webrtc.PeerConnectionStateClosed)
		}
	})

	t.Run("removing peer not in room is a no-op", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		p, _ := newTestPeerWithConn(t)

		r.removePeer(p)

		if len(r.peers) != 0 {
			t.Errorf("peer count = %d, want 0", len(r.peers))
		}
	})
}

func TestRoom_RemoveTrack(t *testing.T) {
	t.Parallel()

	t.Run("removes existing track", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		track := newTestTrack(t, "track-1")
		r.tracks[track.ID()] = track

		r.removeTrack(track)

		if _, ok := r.tracks[track.ID()]; ok {
			t.Error("track still in room after remove")
		}
	})

	t.Run("removing track not in room is a no-op", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		track := newTestTrack(t, "track-2")

		r.removeTrack(track)

		if len(r.tracks) != 0 {
			t.Errorf("track count = %d, want 0", len(r.tracks))
		}
	})
}

func TestRoom_DispatchKeyframe(t *testing.T) {
	t.Parallel()

	t.Run("empty room is a no-op", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		r.dispatchKeyframe()
	})

	t.Run("peer without receiver tracks is a no-op", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		p := newTestPeer(t, nil)
		r.addPeer(p)

		r.dispatchKeyframe()

		if _, ok := r.peers[p.id]; !ok {
			t.Error("peer should still be in room")
		}
	})
}

func TestRoom_Signal(t *testing.T) {
	t.Parallel()

	t.Run("empty room is a no-op", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		r.Signal()
	})

	t.Run("removes peer with closed connection", func(t *testing.T) {
		t.Parallel()

		r := newTestRoom(t)
		p, _ := newTestPeerWithConn(t)
		r.addPeer(p)

		if err := p.pc.Close(); err != nil {
			t.Fatalf("close pc: %v", err)
		}

		r.Signal()

		if _, ok := r.peers[p.id]; ok {
			t.Error("closed peer should have been removed by Signal")
		}
	})
}

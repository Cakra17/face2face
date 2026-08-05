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

const (
	testPeerID = "peer-123"
	testRoomID = "room-1"
)

func newTestPeer(t *testing.T, conn *websocket.Conn) *Peer {
	t.Helper()

	pc, err := webrtc.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		t.Fatalf("create PeerConnection: %v", err)
	}
	t.Cleanup(func() { _ = pc.Close() })

	return NewPeer(testPeerID, conn, pc, context.Background())
}

func newWebSocketPair(t *testing.T) (serverConn, clientConn *websocket.Conn) {
	t.Helper()

	accepted := make(chan *websocket.Conn, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			InsecureSkipVerify: true,
		})
		if err != nil {
			t.Errorf("server accept: %v", err)
			return
		}
		accepted <- c
	}))
	t.Cleanup(srv.Close)

	dialCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	clientConn, _, err := websocket.Dial(dialCtx, srv.URL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	t.Cleanup(func() { _ = clientConn.CloseNow() })

	select {
	case serverConn = <-accepted:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for server-side connection")
	}
	t.Cleanup(func() { _ = serverConn.CloseNow() })

	return serverConn, clientConn
}

func createAnswerFromOfferer(t *testing.T, offerer *webrtc.PeerConnection) webrtc.SessionDescription {
	t.Helper()

	if _, err := offerer.CreateDataChannel("test", nil); err != nil {
		t.Fatalf("create data channel: %v", err)
	}

	remote, err := webrtc.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		t.Fatalf("create remote PeerConnection: %v", err)
	}
	t.Cleanup(func() { _ = remote.Close() })

	offer, err := offerer.CreateOffer(nil)
	if err != nil {
		t.Fatalf("create offer: %v", err)
	}
	if err := offerer.SetLocalDescription(offer); err != nil {
		t.Fatalf("offerer SetLocalDescription: %v", err)
	}
	if err := remote.SetRemoteDescription(*offerer.LocalDescription()); err != nil {
		t.Fatalf("remote SetRemoteDescription: %v", err)
	}

	answer, err := remote.CreateAnswer(nil)
	if err != nil {
		t.Fatalf("create answer: %v", err)
	}
	if err := remote.SetLocalDescription(answer); err != nil {
		t.Fatalf("remote SetLocalDescription: %v", err)
	}
	return *remote.LocalDescription()
}

func TestNewPeer(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		id   string
	}{
		{"populated id", "peer-1"},
		{"empty id", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			p := NewPeer(tt.id, nil, nil, context.Background())
			if p == nil {
				t.Fatal("NewPeer returned nil")
			}
			if p.id != tt.id {
				t.Errorf("id = %q, want %q", p.id, tt.id)
			}
		})
	}
}

func TestPeer_SetPeerConnection(t *testing.T) {
	t.Parallel()

	p := newTestPeer(t, nil)

	replacement, err := webrtc.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		t.Fatalf("create replacement PeerConnection: %v", err)
	}
	t.Cleanup(func() { _ = replacement.Close() })

	p.SetPeerConnection(replacement)

	if p.pc != replacement {
		t.Errorf("pc was not replaced")
	}
}

func TestPeer_HandleAnswer(t *testing.T) {
	t.Parallel()

	t.Run("valid answer sets remote description", func(t *testing.T) {
		t.Parallel()

		p := newTestPeer(t, nil)
		answer := createAnswerFromOfferer(t, p.pc)

		if err := p.HandleAnswer(answer); err != nil {
			t.Errorf("HandleAnswer: %v", err)
		}
		if p.pc.RemoteDescription().SDP == "" {
			t.Error("remote description was not set")
		}
	})

	t.Run("unspecified description type errors", func(t *testing.T) {
		t.Parallel()

		p := newTestPeer(t, nil)

		if err := p.HandleAnswer(webrtc.SessionDescription{}); err == nil {
			t.Error("expected error for zero-value SessionDescription, got nil")
		}
	})
}

func TestPeer_HandleICE(t *testing.T) {
	t.Parallel()

	validCandidate := webrtc.ICECandidateInit{
		Candidate: "candidate:842163049 1 udp 1677729535 192.0.2.3 63123 typ host",
	}

	t.Run("valid candidate after negotiation", func(t *testing.T) {
		t.Parallel()

		p := newTestPeer(t, nil)
		answer := createAnswerFromOfferer(t, p.pc)
		if err := p.HandleAnswer(answer); err != nil {
			t.Fatalf("setup HandleAnswer: %v", err)
		}

		if err := p.HandleICE(validCandidate); err != nil {
			t.Errorf("HandleICE: %v", err)
		}
	})

	t.Run("malformed candidate errors", func(t *testing.T) {
		t.Parallel()

		p := newTestPeer(t, nil)
		answer := createAnswerFromOfferer(t, p.pc)
		if err := p.HandleAnswer(answer); err != nil {
			t.Fatalf("setup HandleAnswer: %v", err)
		}

		if err := p.HandleICE(webrtc.ICECandidateInit{Candidate: "not a valid candidate"}); err == nil {
			t.Error("expected error for malformed candidate, got nil")
		}
	})
}

func TestPeer_Send(t *testing.T) {
	t.Parallel()

	t.Run("writes signal and round-trips JSON", func(t *testing.T) {
		t.Parallel()

		serverConn, clientConn := newWebSocketPair(t)
		p := newTestPeer(t, clientConn)

		want := Signal{
			Type:   SignalOffer,
			Data:   "sdp-offer-data",
			RoomId: testRoomID,
			PeerId: testPeerID,
		}
		if err := p.Send(want); err != nil {
			t.Fatalf("Send: %v", err)
		}

		readCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		var got Signal
		if err := wsjson.Read(readCtx, serverConn, &got); err != nil {
			t.Fatalf("read from server conn: %v", err)
		}
		if got != want {
			t.Errorf("received signal = %+v, want %+v", got, want)
		}
	})
}

func TestPeer_Close(t *testing.T) {
	t.Parallel()

	serverConn, clientConn := newWebSocketPair(t)
	p := newTestPeer(t, clientConn)

	// The server side must be actively reading for coder/websocket to echo the
	// close frame, otherwise Conn.Close blocks for its 5s handshake timeout.
	go func() {
		_, _, _ = serverConn.Read(context.Background())
	}()

	if err := p.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}

	if got := p.pc.ConnectionState(); got != webrtc.PeerConnectionStateClosed {
		t.Errorf("pc state = %v, want %v", got, webrtc.PeerConnectionStateClosed)
	}

	// The client conn should now be closed; a read on the server side should
	// error (either close received or already closed).
	readCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, _, err := serverConn.Read(readCtx); err == nil {
		t.Error("expected server conn to be closed, got nil error")
	}
}

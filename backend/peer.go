package main

import (
	"context"
	"fmt"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/pion/webrtc/v3"
)

type Peer struct {
	id  string
	ctx context.Context
	mu  sync.RWMutex

	conn *websocket.Conn
	pc   *webrtc.PeerConnection
}

func NewPeer(
	id string, conn *websocket.Conn, pc *webrtc.PeerConnection, ctx context.Context,
) *Peer {
	return &Peer{
		id:   id,
		conn: conn,
		pc:   pc,
		ctx:  ctx,
	}
}

func (p *Peer) SetPeerConnection(pc *webrtc.PeerConnection) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.pc = pc
}

func (p *Peer) HandleAnswer(answer webrtc.SessionDescription) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if err := p.pc.SetRemoteDescription(answer); err != nil {
		return fmt.Errorf("Failed to handle answer: %v", err.Error())
	}
	return nil
}

func (p *Peer) HandleICE(candidate webrtc.ICECandidateInit) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.pc.AddICECandidate(candidate)
}

func (p *Peer) Send(msg Signal) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return wsjson.Write(p.ctx, p.conn, msg)
}

func (p *Peer) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	err := p.pc.Close()
	if err != nil {
		return err
	}
	err = p.conn.Close(websocket.StatusNormalClosure, fmt.Sprintf("Closing %s connection", p.id))
	if err != nil {
		return err
	}
	return nil
}

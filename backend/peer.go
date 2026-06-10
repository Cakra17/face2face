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

	conn    *websocket.Conn
	pc      *webrtc.PeerConnection
	streams map[string]*webrtc.TrackRemote
}

func NewPeer(
	id string, conn *websocket.Conn, pc *webrtc.PeerConnection, ctx context.Context,
) *Peer {
	return &Peer{
		id:      id,
		conn:    conn,
		pc:      pc,
		ctx:     ctx,
		streams: make(map[string]*webrtc.TrackRemote),
	}
}

func (p *Peer) AddRemoteTrack(track *webrtc.TrackRemote) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.streams[track.ID()] = track
}

func (p *Peer) RemoveRemoteTrack(track *webrtc.TrackRemote) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.streams, track.ID())
}

func (p *Peer) SetPeerConnection(pc *webrtc.PeerConnection) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.pc = pc
}

func (p *Peer) HandleOffer(msg Signal) (webrtc.SessionDescription, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  msg.SDP,
	}

	if err := p.pc.SetRemoteDescription(offer); err != nil {
		return offer, fmt.Errorf("Failed to Set Remote Description, %s", err.Error())
	}

	answer, err := p.pc.CreateAnswer(nil)
	if err != nil {
		return offer, fmt.Errorf("Failed to Create the answer, %s", err.Error())
	}

	if err := p.pc.SetLocalDescription(answer); err != nil {
		return offer, fmt.Errorf("Failed to set local description, %s", err.Error())
	}

	return answer, nil
}

func (p *Peer) HandleAnswer(answerStr string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	answer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeAnswer,
		SDP:  answerStr,
	}
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

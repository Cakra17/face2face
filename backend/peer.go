package main

import (
	"context"
	"fmt"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/pion/webrtc/v3"
)

// one peer = one websocket connection + one PeerConnection
type Peer struct {
	ID   string
	conn *websocket.Conn
	pc   *webrtc.PeerConnection
	ctx  context.Context
}

func (p *Peer) Send(msg Signal) error {
	return wsjson.Write(p.ctx, p.conn, msg)
}

func (p *Peer) Close() {
	p.pc.Close()
	p.conn.Close(websocket.StatusNormalClosure, fmt.Sprintf("Closing %s connection", p.ID))
}

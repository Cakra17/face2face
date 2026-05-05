package main

import "github.com/pion/webrtc/v3"

type SignalType string

const (
	SignalOffer  SignalType = "offer"
	SignalAnswer SignalType = "answer"
	SignalICE    SignalType = "ice"
	SignalJoin   SignalType = "join"
	SignalLeave  SignalType = "leave"
)

// message
type Signal struct {
	Type      SignalType               `json:"type"`
	SDP       string                   `json:"sdp,omitempty"`
	Candidate *webrtc.ICECandidateInit `json:"candidate,omitempty"`
	RoomId    string                   `json:"room_id"`
	PeerId    string                   `json:"peer_id"`
}

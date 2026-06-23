package main

type SignalType string

const (
	SignalOffer     SignalType = "offer"
	SignalAnswer    SignalType = "answer"
	SignalCandidate SignalType = "candidate"
	SignalJoin      SignalType = "join"
	SignalLeave     SignalType = "leave"
)

type Signal struct {
	Type   SignalType `json:"type"`
	Data   string     `json:"data"`
	RoomId string     `json:"room_id,omitempty"`
	PeerId string     `json:"peer_id,omitempty"`
}

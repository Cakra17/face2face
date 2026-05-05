package main

import "github.com/pion/webrtc/v3"

// caled when new track arrives from peer
func forwardTrack(tr *webrtc.TrackRemote, sender *Peer, room *Room) {
	localTrack, err := webrtc.NewTrackLocalStaticRTP(
		tr.Codec().RTPCodecCapability,
		tr.ID(),
		tr.StreamID(),
	)
	if err != nil {
		return
	}

	room.mu.RLock()
	for _, peer := range room.peers {
		if peer.ID == sender.ID {
			continue
		}
		AddTrackToPeer(peer, localTrack)
	}
	room.mu.RUnlock()

	// copy RTP packets into local tracks forever
	buf := make([]byte, 1500)
	for {
		n, _, err := tr.Read(buf)
		if err != nil {
			return
		}
		localTrack.Write(buf[:n])
	}
}

func AddTrackToPeer(peer *Peer, tr *webrtc.TrackLocalStaticRTP) {
	_, err := peer.pc.AddTrack(tr)
	if err != nil {
		return
	}
}

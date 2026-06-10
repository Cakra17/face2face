enum SIGNAL {
  JOIN = "join",
  LEAVE = "leave",
  OFFER = "offer",
  ANSWER = "answer",
  ICE = "ice",
}

export class Client {
  ws: WebSocket
  pc: RTCPeerConnection
  roomId: string
  peerId: string

  constructor(url: string, roomId: string | null = null) {
    this.ws = new WebSocket(url);
    this.peerId = this.generateId();
    this.roomId = roomId === null ? this.generateId() : roomId;
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
  }

  setRoomId(roomId: string) {
    this.roomId = roomId;
  }

  getRoomId(): string {
    return this.roomId;
  }

  async sendOffer(sdp: string) {
    await this.pc.setRemoteDescription({ 'type': "offer", sdp: sdp});
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.ws.send(JSON.stringify({ type: 'offer', sdp: answer.sdp }));
    console.log("sending offer");
  }

  async sendAnswer(sdp: string) {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: sdp });
    console.log("sending answer");
  }

  async sendICE(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(candidate);
    console.log("sending ICE Candidates");
  }

  joinRoom(): void {
    const data = JSON.stringify({
      "type": SIGNAL.JOIN,
      "room_id": this.roomId,
      "peer_id": this.peerId,
    });
    this.ws.send(data);
    console.log("Join the room");
  }

  leaveRoom(): void {
    const data = JSON.stringify({
      "type": SIGNAL.LEAVE,
      "room_id": this.roomId,
      "peer_id": this.peerId,
    });
    this.ws.send(data);
    console.log("leave the room");
  }

  generateId(): string {
    return `${crypto.randomUUID()}`;
  }

  handleEvent() {
    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case SIGNAL.ANSWER:
          this.sendAnswer(data);
          break;
        case SIGNAL.ICE:
          this.sendICE(data.candidate);
          break;
        case SIGNAL.OFFER:
          this.sendOffer(data);
          break;
        default:
          console.log("hey untech untech async");
          break;
      }
    }
  }
}
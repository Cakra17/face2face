const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{urls: "stun:stun.l.google.com:19302"}],
};

export interface ClientCallback {
  onRemoteStream: (remoteStreams: MediaStream[]) => void;
}

export class Client {
  private socket: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private remoteStream: Map<string, MediaStream> = new Map();

  constructor(
    private url: string,
    private localStream: MediaStream,
    private cb: ClientCallback,
  ) {}

  public connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      this.pc = pc;

      this.localStream.getTracks().forEach(track => { pc.addTrack(track, this.localStream) });

      pc.ontrack = (ev) => {
        const stream = ev.streams[0];
        this.remoteStream.set(stream.id, stream);
        this.emit();

        stream.onremovetrack = () => {
          this.remoteStream.delete(stream.id);
          this.emit();
        }
      }

      this.pc.onicecandidate = (ev) => {
        if (ev.candidate) this.send({ type: "candidate", data: JSON.stringify(ev.candidate) });
      }

      this.socket = new WebSocket(this.url);

      this.socket.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data);

        switch (msg.type) {
          case "offer": 
            const offer = JSON.parse(msg.data);
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.send({ type: "answer", data: JSON.stringify(answer) });
            break;
          case "candidate":
            const candidate = JSON.parse(msg.data);
            if (candidate) await pc.addIceCandidate(candidate);
            break;
        }
      }

      this.socket.onopen = () => {
        console.log("[INFO] Websocket Connected!!!");
        resolve(this.socket!);
      }

      this.socket.onclose = () => { 
        console.log("[INFO] Websocket Disconnected!!!");
        this.close();
      }

      this.socket.onerror = (error) => {
        console.log("[ERROR] Websocket Error: ", error);
        reject(error);
      }
    });	
  }

  public close(): void {
    this.pc?.close();
    this.pc = null;
    this.socket?.close();
    this.socket = null;
    this.emit();
  }

  public join(peerId: string, roomId: string): void {
    this.send({ type: "join", peer_id: peerId, room_id: roomId});
  }

  private emit(): void {
    this.cb.onRemoteStream([...this.remoteStream.values()]);
  }

  private send(data: any): void {
    this.socket?.send(JSON.stringify(data));
  }
}
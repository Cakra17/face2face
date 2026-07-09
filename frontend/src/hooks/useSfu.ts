import { Client } from "@/sfuclient";
import { useCallback, useEffect, useRef, useState } from "react";

export function useClient() {
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [peerID, setPeerID] = useState<string>("");
  const [roomID, setRoomID] = useState<string>("");
  const clientRef = useRef<Client | null>(null); 

  const connectWs = useCallback((roomId: string, peerId: string, localMedia: MediaStream) => { 
    setRoomID(roomId); setPeerID(peerId);
    const client = new Client("ws://localhost:6969/api/v1/ws", localMedia, {
      onRemoteStream: setRemoteStreams
    });
    client.connect().then((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        client.join(peerId, roomId);
      }
    });
    clientRef.current = client;
  },[]);

  const leaveRoom = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    setRemoteStreams([]);
    setPeerID("");
    setRoomID("");
  },[]);

  useEffect(() => clientRef.current?.close(), []);

  return { 
    peerID,
    roomID, 
    remoteStreams, 
    connectWs,
    leaveRoom 
  };
}
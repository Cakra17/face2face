import { createContext, useContext, useEffect, useRef, useState } from "react";

export type UserConnectionType = {
	socket: WebSocket | null;
	isConnected: boolean;
	peerConnection: RTCPeerConnection | null;
	remoteStream: MediaStream[];
	connect: () => void;
	disconnect: () => void;
	joinRoom: (id: string | null) => void;
}

const UserConnectionContext = createContext<UserConnectionType | null>(null);

export const UserConnectionProvider = ({
	url,
	children
}: {
	url: string;
	children: React.ReactNode;
}) => {
	const [isConnected, setIsConnected] = useState<boolean>(false);
	const [shouldConnect, setShouldConnect] = useState<boolean>(false);
	const [remoteStream, setRemoteStream] = useState<MediaStream[]>([]);
	const socketRef = useRef<WebSocket | null>(null);
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

	useEffect(() => {
		if (!shouldConnect) return;

		const socket = new WebSocket(url);
		const pc = new RTCPeerConnection();
		socketRef.current = socket;
		peerConnectionRef.current = pc;

		pc.ontrack = (event) => {
			if (event.track.kind === "audio") return;
			const stream = event.streams[0];
			if (!stream) return;

			console.log("Remote track received: ", stream);

			setRemoteStream((prev) =>
				prev.some((s) => s.id === stream.id) ? prev : [...prev, stream]
			);
		}

		pc.onicecandidate = (event) => {
			if (!event.candidate) return;
			socket.send(JSON.stringify({ type: "candidate", data: JSON.stringify(event.candidate) }));
		}

		socket.onopen = () => {
			console.log("[INFO] Websocket Connected!!!");
			joinRoom();
			console.log("[INFO] Joined Room!!!");
			setIsConnected(true);
		}

		socket.onclose = () => {
			console.log("[INFO] Websocket Disconnected!!!");
			setIsConnected(false);
		}

		socket.onerror = (error) => {
			console.log("[ERROR] Websocket Error: ", error);
		}

		socket.onmessage = async (event) => {
			const msg = JSON.parse(event.data);	
			switch (msg.type) {
				case "offer":
					const offer = JSON.parse(msg.data);
					if (!offer) {
						console.log('failed to parse answer');
						return;
					}
					pc.setRemoteDescription(offer);
					pc.createAnswer().then(answer => {
						pc.setLocalDescription(answer);
						socket.send(JSON.stringify({ type: 'answer', data: JSON.stringify(answer) }));
					})
					break;

				case "candidate": {
					const candidate = JSON.parse(msg.data);
					if (!candidate) {
            console.log('failed to parse candidate');
						return;
          }
					await pc.addIceCandidate(candidate);
					break;
				}
			}	
		}

		return () => {
			socket.close();
			pc.close();
			socketRef.current = null;
			peerConnectionRef.current = null;
		}
	}, [shouldConnect, url]);

	useEffect(() => {
		const cleanup = remoteStream.map(stream => {
			const onEnded = () => {
				setRemoteStream(prev => prev.filter(s => s.id !== stream.id));
			};
			stream.addEventListener('removetrack', onEnded);
			return () => stream.removeEventListener('removetrack', onEnded);
		});

		return () => cleanup.forEach(fn => fn());
	}, [remoteStream]);

	const joinRoom = (id: string | null = null) => {
		let peerId = id;
		if (!id) {
			peerId = crypto.randomUUID();
		}
		socketRef.current?.send(JSON.stringify({ type: "join", room_id: "room-1", peer_id: peerId }));
	}

	const connect = () => {
		if (socketRef.current?.readyState === WebSocket.OPEN) return;
		setShouldConnect(true);
	};

	const disconnect = () => {
		setShouldConnect(false);
		if (socketRef.current) {
			socketRef.current.close();
			socketRef.current = null;
		}
		setIsConnected(false);
	};

	return (
		<UserConnectionContext.Provider
			value={{
				isConnected,
				socket: socketRef.current,
				peerConnection: peerConnectionRef.current,
				joinRoom,
				connect,
				disconnect,
				remoteStream,
			}}
		>
			{children}
		</UserConnectionContext.Provider>
	);
};

export function useConnection() {
	const context = useContext(UserConnectionContext);
	if (!context) {
		throw new Error("useConnection must be used within a UserConnectionProvider");
	}
	return context;
}

import { createContext, useContext, useState } from "react";
import { useClient } from "./hooks/useSfu";
import useMedia from "./hooks/useMedia";

type Media = {
 	videoRef: React.RefObject<HTMLVideoElement | null>;
	webcamActive: boolean;
	micActive: boolean;
	mediaStream: MediaStream | null;
	toggleWebcam: () => void;
	toggleAudio: () => void;
	startWebcam: () => Promise<MediaStream>;
	stopWebcam: () => void;
}

export type UserConnectionType = {
	isConnected: boolean;
	localMedia: Media;
	connect: (roomId: string, peerId: string, localMedia: MediaStream) => void;
	disconnect: () => void;
	getRemoteStreams: () => MediaStream[]
}

const UserConnectionContext = createContext<UserConnectionType | null>(null);

export const UserConnectionProvider = ({
	children
}: {
	children: React.ReactNode;
}) => {
	const [isConnected, setIsConnected] = useState<boolean>(false);
  const client = useClient();
	const localMedia = useMedia();

  const connect = (roomId: string, peerId: string, localMedia: MediaStream) => {
		client.connectWs(roomId, peerId, localMedia);
		setIsConnected(true);
  };

  const disconnect = () => {
		client.leaveRoom();
		setIsConnected(false);
  };

	const getRemoteStreams = () => {
		return client.remoteStreams;
	}

	return (
		<UserConnectionContext.Provider
			value={{
				isConnected,
				localMedia,
				connect,
				disconnect,
				getRemoteStreams,
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

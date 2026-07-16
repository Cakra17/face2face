import { useNavigate, useParams } from "@tanstack/react-router";
import { Camera, CameraOff, LogOut, Mic, MicOff } from "lucide-react";
import Button from "@/components/button";
import VideoTile from "@/components/video-tile";
import { useConnection } from "@/connection";

export default function Room() {
	const { roomId } = useParams({ strict: false });
	const navigate = useNavigate();
	const clientCtx = useConnection();

	const handleLeave = () => {
		clientCtx.disconnect();
		navigate({ to: "/"});
	}

	return (
		<section className="relative w-full h-dvh bg-gray-950 flex flex-col">
			<header className="flex items-center justify-between px-4 py-2 bg-gray-900/80">
				<h1 className="text-white font-bold text-sm sm:text-base">
					Room: {roomId}
				</h1>
			</header>

			<div id="remoteVideos" className="flex-1 p-2 sm:p-4 overflow-auto">
				{clientCtx.getRemoteStreams().length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<p className="text-gray-400 text-lg">
							Waiting for others to join...
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-2 sm:gap-3 h-full">
						{clientCtx.getRemoteStreams().map((stream, index) => (
							<VideoTile key={stream.id || index} stream={stream} label={stream.id} />
						))}
					</div>
				)}
			</div>

			{clientCtx.localMedia.mediaStream && (
				<div className="absolute bottom-16 right-3 sm:right-4 w-1/3 sm:w-1/4 lg:w-1/5 z-10 rounded-xl overflow-hidden shadow-lg border border-white/10">
					<VideoTile stream={clientCtx.localMedia.mediaStream} muted label="You" />
				</div>
			)}

			<div className="flex items-center justify-center gap-3 py-3 bg-gray-900/80">
				{ clientCtx.localMedia.webcamActive ? 
					(<Button onClick={clientCtx.localMedia.toggleWebcam} Icon={Camera} variant="active" />) : 
					(<Button onClick={clientCtx.localMedia.toggleWebcam} Icon={CameraOff} variant="deactivate" />)
				}
				{ clientCtx.localMedia.micActive ? 
					(<Button onClick={clientCtx.localMedia.toggleAudio} Icon={Mic} variant="active" />) : 
					(<Button onClick={clientCtx.localMedia.toggleAudio} Icon={MicOff} variant="deactivate" />)
				}
				
				<button
					onClick={handleLeave}
					type="button"
					className="flex items-center justify-center gap-2 rounded-2xl h-12 px-4 cursor-pointer backdrop-blur-sm bg-red-400/80 hover:bg-red-300 text-white font-bold"
				>
					<LogOut />
					<span className="hidden sm:inline">Leave</span>
				</button>
			</div>
		</section>
	);
}

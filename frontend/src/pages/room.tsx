import { useNavigate, useParams } from "@tanstack/react-router";
import { Camera, CameraOff, LogOut, Mic, MicOff, Users } from "lucide-react";
import Button from "@/components/button";
import CopyButton from "@/components/copy-button";
import VideoTile from "@/components/video-tile";
import { useConnection } from "@/connection";

export default function Room() {
	const { roomId } = useParams({ strict: false });
	const navigate = useNavigate();
	const clientCtx = useConnection();

	const handleLeave = () => {
		clientCtx.disconnect();
		navigate({ to: "/" });
	};

	const isEmpty = clientCtx.getRemoteStreams().length === 0;

	return (
		<section className="relative flex h-dvh w-full flex-col bg-[#191919]">
			{/* Header (always dark) */}
			<header className="border-b border-white/10 bg-[#202020]">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
					<div className="flex items-center gap-2">
						<span className="text-sm text-white/50">Room</span>
						<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white">
							{roomId}
						</span>
						<CopyButton value={roomId ?? ""} variant="compact" tone="dark" />
					</div>
				</div>
			</header>

			{/* Stage (always dark) */}
			<div
				id="remoteVideos"
				className="relative flex-1 overflow-auto bg-[#191919] p-3 sm:p-4"
			>
				{isEmpty ? (
					<div className="flex h-full items-center justify-center">
						<div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-8 text-center">
							<div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white/80">
								<Users className="h-5 w-5" strokeWidth={1.75} />
							</div>
							<h2 className="mb-1 text-lg font-semibold text-white">
								Waiting for others to join
							</h2>
							<p className="mb-5 text-sm text-white/60">
								Share the room ID to invite people.
							</p>
							<CopyButton
								value={roomId ?? ""}
								variant="cta"
								label="Copy room ID"
							/>
						</div>
					</div>
				) : (
					<div className="grid h-full auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
						{clientCtx.getRemoteStreams().map((stream, index) => (
							<VideoTile
								key={stream.id || index}
								stream={stream}
								label={stream.id}
							/>
						))}
					</div>
				)}

				{clientCtx.localMedia.mediaStream && (
					<div className="absolute bottom-20 right-3 z-10 w-1/3 overflow-hidden rounded-xl border border-white/10 shadow-xl sm:right-4 sm:w-1/4 lg:w-1/5">
						<VideoTile
							stream={clientCtx.localMedia.mediaStream}
							muted
							label="You"
						/>
					</div>
				)}
			</div>

			{/* Controls (always dark) */}
			<div className="flex items-center justify-center gap-3 border-t border-white/10 bg-[#202020] py-3">
				{clientCtx.localMedia.webcamActive ? (
					<Button
						onClick={clientCtx.localMedia.toggleWebcam}
						Icon={Camera}
						variant="active"
					/>
				) : (
					<Button
						onClick={clientCtx.localMedia.toggleWebcam}
						Icon={CameraOff}
						variant="deactivate"
					/>
				)}
				{clientCtx.localMedia.micActive ? (
					<Button
						onClick={clientCtx.localMedia.toggleAudio}
						Icon={Mic}
						variant="active"
					/>
				) : (
					<Button
						onClick={clientCtx.localMedia.toggleAudio}
						Icon={MicOff}
						variant="deactivate"
					/>
				)}

				<button
					onClick={handleLeave}
					type="button"
					className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 font-medium text-white transition-colors hover:bg-red-600"
				>
					<LogOut />
					<span className="hidden sm:inline">Leave</span>
				</button>
			</div>
		</section>
	);
}

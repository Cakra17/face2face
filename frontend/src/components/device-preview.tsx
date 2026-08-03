import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import { useEffect } from "react";
import Button from "@/components/button";
import { useConnection } from "@/connection";

export default function DevicePreview() {
	const { localMedia } = useConnection();
	const { startWebcam } = localMedia;

	useEffect(() => {
		startWebcam();
	}, [startWebcam]);

	return (
		<div className="relative col-span-1 overflow-hidden rounded-xl border border-border bg-bg-subtle shadow-sm sm:col-span-2">
			<video
				id="webcam"
				autoPlay
				playsInline
				muted
				ref={localMedia.videoRef}
				width="1280"
				height="720"
				className="h-auto w-full"
			/>
			<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-row items-center gap-2">
				{localMedia.webcamActive ? (
					<Button
						onClick={localMedia.toggleWebcam}
						Icon={Camera}
						variant="active"
					/>
				) : (
					<Button
						onClick={localMedia.toggleWebcam}
						Icon={CameraOff}
						variant="deactivate"
					/>
				)}
				{localMedia.micActive ? (
					<Button
						onClick={localMedia.toggleAudio}
						Icon={Mic}
						variant="active"
					/>
				) : (
					<Button
						onClick={localMedia.toggleAudio}
						Icon={MicOff}
						variant="deactivate"
					/>
				)}
			</div>
		</div>
	);
}

import { useNavigate } from "@tanstack/react-router";
import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import Button from "@/components/button";
import Footer from "@/components/footer";
import Nav from "@/components/nav";
import { useConnection } from "@/connection";

export default function Preview() {
	const clientCtx = useConnection();
	const navigate = useNavigate();
	const stream = useRef<MediaStream>(null);

	const handleRoomId = (event: React.FocusEvent<HTMLInputElement>) => {
		const { value } = event.target;
		console.log(value);
	};

	const makeId = () => {
		return crypto.randomUUID();
	};

	const setCameraUp = async () => {
		stream.current = await clientCtx.localMedia.startWebcam();
	};

	const handleJoin = async (event: React.SubmitEvent) => {
		event.preventDefault();
		stream.current = await clientCtx.localMedia.startWebcam();
		clientCtx.connect("room-1", makeId(), stream.current);
		navigate({ to: "/rooms/$roomId", params: { roomId: "room-1" } });
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only camera setup
	useEffect(() => {
		setCameraUp();
	}, [stream]);

	return (
		<section className="flex min-h-dvh w-full flex-col bg-bg">
			<Nav />

			<main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16 sm:gap-12 sm:py-20">
				<div className="max-w-2xl text-center">
					<h1 className="mb-4 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
						Ready to join?
					</h1>
					<p className="mx-auto max-w-xl text-base text-fg-muted sm:text-lg">
						Check your camera and mic before entering the room.
					</p>
				</div>

				<div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
					<div className="relative col-span-1 overflow-hidden rounded-xl border border-border bg-bg-subtle shadow-sm sm:col-span-2">
						<video
							id="webcam"
							autoPlay
							playsInline
							muted
							ref={clientCtx.localMedia.videoRef}
							width="1280"
							height="720"
							className="h-auto w-full"
						/>
						<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-row items-center gap-2">
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
						</div>
					</div>

					<div className="col-span-1 flex items-center rounded-xl border border-border bg-bg p-6 shadow-sm sm:col-span-1">
						<form onSubmit={handleJoin} method="GET" className="w-full">
							<div className="mb-4 flex flex-col gap-1.5">
								<label
									htmlFor="room-id"
									className="text-sm font-medium text-fg"
								>
									Room ID
								</label>
								<input
									id="room-id"
									onBlur={handleRoomId}
									type="text"
									placeholder="Enter room ID"
									className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-fg focus:ring-2 focus:ring-fg/10"
								/>
							</div>
							<button
								type="submit"
								className="w-full cursor-pointer rounded-lg bg-cta px-4 py-2.5 text-sm font-medium text-cta-fg transition-opacity hover:opacity-90"
							>
								Join Room
							</button>
						</form>
					</div>
				</div>
			</main>

			<Footer />
		</section>
	);
}

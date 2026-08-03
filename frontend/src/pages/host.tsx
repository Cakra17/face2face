import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import DevicePreview from "@/components/device-preview";
import Footer from "@/components/footer";
import Nav from "@/components/nav";
import { useConnection } from "@/connection";

export default function Host() {
	const clientCtx = useConnection();
	const navigate = useNavigate();
	const [roomId, setRoomId] = useState("");

	const makeId = () => crypto.randomUUID();

	const handleCreate = async (event: React.SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const finalRoomId = roomId.trim() || crypto.randomUUID();
		const stream =
			clientCtx.localMedia.mediaStream ??
			(await clientCtx.localMedia.startWebcam());
		clientCtx.connect(finalRoomId, makeId(), stream);
		navigate({ to: "/rooms/$roomId", params: { roomId: finalRoomId } });
	};

	return (
		<section className="flex min-h-dvh w-full flex-col bg-bg">
			<Nav />

			<main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16 sm:gap-12 sm:py-20">
				<div className="max-w-2xl text-center">
					<h1 className="mb-4 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
						Start your own room
					</h1>
					<p className="mx-auto max-w-xl text-base text-fg-muted sm:text-lg">
						Set a room ID, check your devices, and invite others in.
					</p>
				</div>

				<div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
					<DevicePreview />

					<div className="col-span-1 flex items-center rounded-xl border border-border bg-bg p-6 shadow-sm sm:col-span-1">
						<form onSubmit={handleCreate} className="w-full">
							<div className="mb-4 flex flex-col gap-1.5">
								<label
									htmlFor="room-id"
									className="text-sm font-medium text-fg"
								>
									Room ID
								</label>
								<input
									id="room-id"
									value={roomId}
									onChange={(e) => setRoomId(e.target.value)}
									type="text"
									placeholder="Choose a room ID"
									className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-fg focus:ring-2 focus:ring-fg/10"
								/>
								<p className="text-xs text-fg-subtle">
									Leave blank to generate a random room ID.
								</p>
							</div>
							<button
								type="submit"
								className="w-full cursor-pointer rounded-lg bg-cta px-4 py-2.5 text-sm font-medium text-cta-fg transition-opacity hover:opacity-90"
							>
								Create Room
							</button>
						</form>
					</div>
				</div>
			</main>

			<Footer />
		</section>
	);
}

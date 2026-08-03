import { UserPlus, Video } from "lucide-react";
import Card from "@/components/card";
import Footer from "@/components/footer";
import Nav from "@/components/nav";

export default function Home() {
	return (
		<section className="flex min-h-dvh w-full flex-col bg-bg">
			<Nav />

			<main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16 sm:gap-14 sm:py-24">
				<div className="max-w-2xl text-center">
					<h1 className="mb-4 text-4xl font-bold tracking-tight text-fg sm:text-6xl">
						Connect face to face, online.
					</h1>
					<p className="mx-auto max-w-xl text-base text-fg-muted sm:text-lg">
						A fast, minimal video calling experience. Join an existing room or
						start your own in seconds — no installs required.
					</p>
				</div>

				<div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
					<Card
						title="Join as Client"
						description="Hop into a video call as a participant."
						to="/preview"
						icon={UserPlus}
					/>
					<Card
						title="Create as Host"
						description="Start a new room and invite others in."
						to="/host"
						icon={Video}
					/>
				</div>
			</main>

			<Footer />
		</section>
	);
}

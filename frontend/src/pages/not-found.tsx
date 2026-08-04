import { Link } from "@tanstack/react-router";
import Footer from "@/components/footer";
import Nav from "@/components/nav";

export default function NotFound() {
	return (
		<section className="flex min-h-dvh w-full flex-col bg-bg">
			<Nav />
			<main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16 sm:gap-14 sm:py-24">
				<div className="max-w-2xl text-center">
					<h1 className="mb-4 text-6xl font-bold tracking-tight text-fg sm:text-7xl">
						404
					</h1>
					<h2 className="mb-3 text-2xl font-semibold text-fg sm:text-3xl">
						Page not found
					</h2>
					<p className="mx-auto max-w-xl text-base text-fg-muted sm:text-lg">
						The page you're looking for doesn't exist or may have moved.
					</p>
				</div>
				<Link
					to="/"
					className="rounded-lg bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-opacity hover:opacity-90"
				>
					Back to home
				</Link>
			</main>
			<Footer />
		</section>
	);
}

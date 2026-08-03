import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/theme-toggle";

export default function Nav({ children }: { children?: ReactNode }) {
	return (
		<header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
			<nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
				<Link to="/" className="flex items-center gap-2">
					<span className="flex h-7 w-7 items-center justify-center rounded-md bg-cta text-cta-fg">
						<Camera className="h-4 w-4" strokeWidth={2} />
					</span>
					<span className="text-base font-semibold text-fg">Face2Face</span>
				</Link>
				<div className="flex items-center gap-2 sm:gap-4">
					<ThemeToggle />
					{children}
				</div>
			</nav>
		</header>
	);
}

import { Camera } from "lucide-react";

export default function Footer() {
	return (
		<footer className="border-t border-border">
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
				<div className="flex items-center gap-2">
					<span className="flex h-5 w-5 items-center justify-center rounded bg-cta text-cta-fg">
						<Camera className="h-3 w-3" strokeWidth={2.5} />
					</span>
					<span className="text-sm text-fg-subtle">
						© {new Date().getFullYear()} Face2Face
					</span>
				</div>
				<div className="flex items-center gap-5 text-sm text-fg-subtle">
					<a href="/privacy" className="transition-colors hover:text-fg">
						Privacy
					</a>
					<a href="/terms" className="transition-colors hover:text-fg">
						Terms
					</a>
					<a href="/contact" className="transition-colors hover:text-fg">
						Contact
					</a>
				</div>
			</div>
		</footer>
	);
}

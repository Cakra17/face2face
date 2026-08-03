import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface CardProps {
	title: string;
	to: string;
	description?: string;
	icon?: LucideIcon;
}

export default function Card({
	title,
	to,
	description,
	icon: Icon,
}: CardProps) {
	return (
		<Link
			to={to}
			className="group block rounded-xl border border-border bg-bg p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
		>
			{Icon && (
				<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-bg-muted text-fg transition-colors duration-200 group-hover:bg-border">
					<Icon className="h-5 w-5" strokeWidth={1.75} />
				</div>
			)}
			<h2 className="mb-1.5 text-lg font-semibold text-fg">{title}</h2>
			{description && (
				<p className="mb-4 text-sm text-fg-subtle">{description}</p>
			)}
			<span className="inline-flex items-center text-sm font-medium text-fg">
				Get started
				<ChevronRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
			</span>
		</Link>
	);
}

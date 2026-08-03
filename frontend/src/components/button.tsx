import type { LucideIcon } from "lucide-react";

type Variant = keyof typeof invariant;

const invariant = {
	deactivate: "bg-red-500/90 text-white hover:bg-red-500",
	active: "bg-white/15 text-white ring-1 ring-white/10 hover:bg-white/25",
} as const;

interface ButtonProps {
	onClick: () => void;
	variant: Variant;
	Icon: LucideIcon;
}

export default function Button({ onClick, variant, Icon }: ButtonProps) {
	return (
		<button
			onClick={onClick}
			type="button"
			className={`flex items-center justify-center rounded-2xl w-12 h-12 cursor-pointer backdrop-blur-md ${invariant[variant]}`}
		>
			<Icon />
		</button>
	);
}

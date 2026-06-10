import type { LucideIcon } from "lucide-react";

type Variant = keyof typeof invariant;

const invariant = {
	deactivate: "bg-red-400/80 hover:bg-red-300",
	active: "bg-blue-400/80 hover:bg-blue-300",
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
			className={`flex items-center justify-center rounded-2xl w-12 h-12 cursor-pointer backdrop-blur-sm ${invariant[variant]}`}
		>
			<Icon />
		</button>
	);
}

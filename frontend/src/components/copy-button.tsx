import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
	value: string;
	variant: "compact" | "cta";
	label?: string;
	tone?: "theme" | "dark";
}

export default function CopyButton({
	value,
	variant,
	label,
	tone = "theme",
}: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			alert("the clipboard is unavilable");
		}
	};

	if (variant === "compact") {
		const compactClass =
			tone === "dark"
				? "text-white/60 hover:bg-white/10 hover:text-white"
				: "text-fg-muted hover:bg-bg-muted hover:text-fg";
		return (
			<button
				type="button"
				onClick={handleCopy}
				aria-label="Copy room ID"
				className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${compactClass}`}
			>
				{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a1a] transition-opacity hover:opacity-90"
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			{copied ? "Copied!" : (label ?? "Copy")}
		</button>
	);
}

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function ThemeToggle() {
	const { toggleTheme } = useTheme();
	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label="Toggle color theme"
			className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
		>
			<Moon className="block h-4 w-4 dark:hidden" />
			<Sun className="hidden h-4 w-4 dark:block" />
		</button>
	);
}

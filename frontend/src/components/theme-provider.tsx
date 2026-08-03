import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function domIsDark(): boolean {
	if (typeof document === "undefined") return false;
	return document.documentElement.classList.contains("dark");
}

function readStored(): Theme | null {
	if (typeof localStorage === "undefined") return null;
	const v = localStorage.getItem(STORAGE_KEY);
	return v === "dark" || v === "light" ? v : null;
}

function applyTheme(next: Theme) {
	const root = document.documentElement;
	root.classList.toggle("dark", next === "dark");
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// ignore (e.g. private mode / storage disabled)
	}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>("light");

	// Sync from DOM (set pre-paint by the no-flash script) after mount.
	useEffect(() => {
		const stored = readStored();
		setTheme(stored ?? (domIsDark() ? "dark" : "light"));
	}, []);

	const toggleTheme = useCallback(() => {
		// Read the source of truth (DOM) so the flip is always correct.
		const next: Theme = domIsDark() ? "light" : "dark";
		applyTheme(next);
		setTheme(next);
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return ctx;
}

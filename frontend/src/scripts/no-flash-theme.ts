(() => {
	try {
		const stored = localStorage.getItem("theme");
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		if (stored === "dark" || (stored !== "light" && prefersDark)) {
			document.documentElement.classList.add("dark");
		}
	} catch {
		console.log("Failed to get theme");
	}
})();

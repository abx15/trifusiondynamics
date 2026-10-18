"use client";

import { useEffect } from "react";
import { Sun } from "lucide-react";

const THEME_STORAGE_KEY = "trifusion-theme";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";

    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function toggleTheme() {
    const nextTheme =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  const label = "Toggle light and dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-primary/30 hover:text-primary ${
        compact ? "h-10 w-10" : "h-9 w-9"
      }`}
    >
      <Sun className="h-4 w-4" />
    </button>
  );
}

"use client";

import { Sun, Moon } from "lucide-react";
import { useUIStore } from "@/src/stores/ui-store";
import { useEffect, useRef } from "react";

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setTheme = useUIStore((s) => s.setTheme);
  const synced = useRef(false);

  // Sync theme on mount (hydration) — only once
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      const current = document.documentElement.getAttribute("data-theme");
      if (current !== theme) {
        setTheme(theme);
      }
    }
  }, [theme, setTheme]);

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}

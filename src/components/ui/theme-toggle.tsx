"use client";

import { Sun, Moon } from "lucide-react";
import { useUIStore } from "@/src/stores/ui-store";
import { useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme, setTheme } = useUIStore();

  // Sync theme on mount (hydration)
  useEffect(() => {
    setTheme(theme);
  }, []);

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

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useUIStore } from "@/src/stores/ui-store";

// 40px circular toggle per DESIGN_SYSTEM.md, sits to the left of "Sign in"
// in the marketing nav. Uses the existing Zustand UI store so the
// override persists across pages and the dashboard sees the same theme.
//
// On mount, if nothing is persisted, we sync the store to whatever the
// pre-hydration script picked (system preference). After that, the
// toggle controls it directly. We also listen to OS theme changes and
// follow them — but only when the user hasn't explicitly overridden
// (tracked via the presence of a stored value at mount time).

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const [mounted, setMounted] = useState(false);
  const [followsOs, setFollowsOs] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Did the user explicitly persist a theme? If not, we should sync
    // the store to whatever the pre-hydration script applied (system
    // preference) and keep tracking OS changes.
    let hadOverride = false;
    try {
      const raw = localStorage.getItem("conduikt-ui");
      const parsed = raw ? JSON.parse(raw) : null;
      hadOverride = !!parsed?.state?.theme;
    } catch {
      // ignore
    }
    setFollowsOs(!hadOverride);

    // If we're following OS, sync the Zustand store to the actual
    // applied theme (which the pre-hydration script set from system pref).
    if (!hadOverride) {
      const applied = (document.documentElement.getAttribute("data-theme") ||
        "dark") as "dark" | "light";
      if (applied !== theme) setTheme(applied);
    }
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OS theme listener — only acts when the user hasn't overridden.
  useEffect(() => {
    if (!followsOs) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange(e: MediaQueryListEvent) {
      setTheme(e.matches ? "dark" : "light");
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [followsOs, setTheme]);

  function handleToggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // Once the user clicks, stop following OS changes for this session.
    setFollowsOs(false);
  }

  // Render a placeholder so layout doesn't shift during hydration.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-1 text-text-tertiary"
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-1 text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
    >
      {isDark ? (
        <Moon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

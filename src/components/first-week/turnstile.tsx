"use client";

import * as React from "react";

// Cloudflare Turnstile widget. Renders nothing (and reports ready with a
// null token) when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set, so local dev
// and unconfigured deploys still work behind the rate limit alone.

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const turnstileOn = !!SITE_KEY;

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const cb = React.useRef(onToken);
  React.useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  React.useEffect(() => {
    if (!SITE_KEY) {
      cb.current(null);
      return;
    }
    let id: string | null = null;
    const mount = () => {
      if (!ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        theme: "light",
        callback: (t: string) => cb.current(t),
        "error-callback": () => cb.current(null),
      });
    };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = SCRIPT;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", mount, { once: true });
    }
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}

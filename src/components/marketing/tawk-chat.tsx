"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

// Tawk.to live chat widget. Renders only when both env vars are set so
// local dev and previews without the IDs don't load the script.
//
// docs/DESIGN.md §Marketing site: the chat widget is hidden above the
// fold and never overlaps a CTA. Any section marked `data-hide-chat`
// (the hero and the final CTA band) hides the widget while it is on
// screen; it shows again once those sections scroll away.
//
// It never shows on the sign-in, sign-up and password pages: nothing
// should float over those forms.
const TAWK_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
const TAWK_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

export function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type TawkApi = {
  onLoad?: () => void;
  hideWidget?: () => void;
  showWidget?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

export function TawkChat() {
  const pathname = usePathname();
  const onAuthRoute = isAuthRoute(pathname);
  // The script stays loaded across client-side navigation, so the route
  // rule has to be applied by the same show/hide logic as the sections.
  const onAuthRouteRef = useRef(onAuthRoute);
  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onAuthRouteRef.current = onAuthRoute;
  }, [onAuthRoute]);

  useEffect(() => {
    if (!TAWK_PROPERTY_ID || !TAWK_WIDGET_ID) return;

    const blockers = new Set<Element>();

    const apply = () => {
      if (!loadedRef.current) return;
      const shouldHide = onAuthRouteRef.current || blockers.size > 0;
      if (shouldHide) window.Tawk_API?.hideWidget?.();
      else window.Tawk_API?.showWidget?.();
    };

    window.Tawk_API = window.Tawk_API || {};
    const prevOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = () => {
      prevOnLoad?.();
      loadedRef.current = true;
      setLoaded(true);
      apply();
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) blockers.add(e.target);
        else blockers.delete(e.target);
      }
      apply();
    });

    // Sections may mount after this effect (route changes), so re-scan.
    const scan = () => document.querySelectorAll("[data-hide-chat]").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    apply();

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [onAuthRoute]);

  if (!TAWK_PROPERTY_ID || !TAWK_WIDGET_ID) return null;
  // Not loaded yet on an auth page: don't load it there at all.
  if (onAuthRoute && !loaded) return null;

  return (
    <Script
      id="tawk-chat"
      strategy="lazyOnload"
      src={`https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`}
      crossOrigin="anonymous"
    />
  );
}

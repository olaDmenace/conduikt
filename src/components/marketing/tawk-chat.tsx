"use client";

import { useEffect } from "react";
import Script from "next/script";

// Tawk.to live chat widget. Renders only when both env vars are set so
// local dev and previews without the IDs don't load the script.
//
// docs/DESIGN.md §Marketing site: the chat widget is hidden above the
// fold and never overlaps a CTA. Any section marked `data-hide-chat`
// (the hero and the final CTA band) hides the widget while it is on
// screen; it shows again once those sections scroll away.
const TAWK_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
const TAWK_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

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
  useEffect(() => {
    if (!TAWK_PROPERTY_ID || !TAWK_WIDGET_ID) return;

    const blockers = new Set<Element>();
    let loaded = false;

    const apply = () => {
      if (!loaded) return;
      const shouldHide = blockers.size > 0;
      if (shouldHide) window.Tawk_API?.hideWidget?.();
      else window.Tawk_API?.showWidget?.();
    };

    window.Tawk_API = window.Tawk_API || {};
    const prevOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = () => {
      prevOnLoad?.();
      loaded = true;
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

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  if (!TAWK_PROPERTY_ID || !TAWK_WIDGET_ID) return null;

  return (
    <Script
      id="tawk-chat"
      strategy="lazyOnload"
      src={`https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`}
      crossOrigin="anonymous"
    />
  );
}

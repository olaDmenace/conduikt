"use client";

import Script from "next/script";

// Tawk.to live chat widget — globally available, free tier covers
// unlimited agents/conversations forever. Renders only when both env
// vars are set so local dev (and previews without the IDs) don't load
// the widget script. lazyOnload matches the pattern used for Google
// Analytics in src/app/layout.tsx — chat shouldn't block page paint.
const TAWK_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
const TAWK_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

export function TawkChat() {
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

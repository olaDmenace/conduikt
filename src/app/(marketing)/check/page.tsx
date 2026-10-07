import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteCheck } from "./site-check";

export const metadata: Metadata = {
  title: "Check my site",
  description: "A free check of your website: score, how you sound, three posts in your voice, and a preview from every agent.",
  // Result pages are per-visitor; keep them out of search.
  robots: { index: false, follow: true },
};

export default function CheckPage() {
  return (
    <Suspense>
      <SiteCheck />
    </Suspense>
  );
}

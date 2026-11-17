import type { NextConfig } from "next";

// Content Security Policy — enforced.
//
// This ran as Content-Security-Policy-Report-Only from launch until
// 2026-11-17. The only violation the report log showed in that window was
// Google Analytics beaconing to https://www.google.com/g/collect (it sends
// there as well as to *.google-analytics.com), which is now allowed under
// connect-src. Browsers block anything else that is not listed here and
// still POST a report to /api/csp-report, so keep report-uri: new
// violations are how we learn a source is missing.
//
// Why each source is here:
//   script-src: 'unsafe-inline' required by Next.js runtime (inline hydration
//     script); 'unsafe-eval' guarded but sometimes hit by tooling. Flutterwave
//     + Paystack inline SDKs load from their own domains.
//   style-src: 'unsafe-inline' required by Tailwind runtime + framer-motion.
//     fonts.googleapis.com serves the @import stylesheet for our Google fonts.
//   img-src: broad https: because AI-generated marketing content pulls images
//     from many domains (Unsplash, X user avatars, LinkedIn CDN, etc.).
//   connect-src: Supabase (data plane + realtime WSS), Anthropic (server-
//     initiated; the browser rarely needs this but streaming responses may).
//   media-src: generated videos play from their public Supabase Storage URL
//     (video-pipeline.ts getPublicUrl); blob: for in-browser previews.
//   frame-src: payment iframes, plus https://www.google.com for the keyless
//     Google Maps embed on hosted pages (hosted-pages/html.ts, render.tsx).
//   object-src 'self': the one <object> we render is the same-origin PDF
//     preview on /share (/api/marketing-kit/pdf). Third-party plugins stay
//     blocked.
//   Google Analytics (gtag): script from googletagmanager.com, beacons to
//     *.google-analytics.com / *.analytics.google.com and, for some
//     sessions, https://www.google.com/g/collect.
//   Tawk chat: scripts, styles, fonts, XHR and a websocket on *.tawk.to,
//     plus its widget iframes.
//   Cloudflare Turnstile: the anonymous "Check my site" bot check (script
//     + challenge iframe on challenges.cloudflare.com).
//   frame-ancestors 'self': mirrors X-Frame-Options SAMEORIGIN so modern
//     browsers use CSP semantics.
//
// If a violation report shows a source we forgot, add it here — don't broaden
// to `https:` unless the source is genuinely unlimited.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://js.paystack.co https://cdn.jsdelivr.net https://va.vercel-scripts.com https://www.googletagmanager.com https://embed.tawk.to https://*.tawk.to https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://embed.tawk.to",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://embed.tawk.to",
  "media-src 'self' blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://checkout.flutterwave.com https://api.paystack.co https://vitals.vercel-insights.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.com https://*.tawk.to wss://*.tawk.to",
  "frame-src 'self' https://checkout.flutterwave.com https://checkout.paystack.com https://*.tawk.to https://challenges.cloudflare.com https://www.google.com",
  "frame-ancestors 'self'",
  "form-action 'self' https://checkout.flutterwave.com https://checkout.paystack.com",
  "base-uri 'self'",
  "object-src 'self'",
  // Trailing slash matters: trailingSlash:true 308s the bare path and
  // browsers never follow redirects when sending reports.
  "report-uri /api/csp-report/",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "accelerometer=()",
      "gyroscope=()",
      "magnetometer=()",
      "interest-cohort=()",
      "browsing-topics=()",
    ].join(", "),
  },
  // Enforced since 2026-11-17 (see the CSP comment above). Violations are
  // blocked and reported to /api/csp-report.
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ["@icon-park/react"],
  },
  // PDF routes read the bundled report fonts from disk at render time
  // (src/lib/pdf/brand.ts → registerPdfFonts); make sure they ship with
  // those functions.
  outputFileTracingIncludes: {
    "/api/**/pdf": ["./src/lib/pdf/fonts/**/*"],
    "/api/marketing-kit/pdf": ["./src/lib/pdf/fonts/**/*"],
  },
  // docs/DESIGN.md §Navigation model: the global agents menu and the
  // Playground are retired. Their routes open the agent picker instead.
  async redirects() {
    return [
      { source: "/playground", destination: "/dashboard?pick=creation", permanent: false },
      { source: "/agents", destination: "/dashboard?pick=analysis", permanent: false },
      { source: "/agents/:path*", destination: "/dashboard?pick=analysis", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

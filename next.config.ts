import type { NextConfig } from "next";

// Content Security Policy — Report-Only mode.
//
// This runs alongside the enforced headers below. Browsers evaluate the
// policy but do NOT block anything; instead they POST violation reports to
// /api/csp-report where we log them. Once we've watched real traffic for
// 7-14 days and confirmed the policy doesn't break checkout, generation,
// or any legitimate load, flip the header key from
// `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
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
//   frame-src: payment iframes.
//   frame-ancestors 'self': mirrors X-Frame-Options SAMEORIGIN so modern
//     browsers use CSP semantics.
//
// If a violation report shows a source we forgot, add it here — don't broaden
// to `https:` unless the source is genuinely unlimited.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://js.paystack.co https://cdn.jsdelivr.net https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://checkout.flutterwave.com https://api.paystack.co https://vitals.vercel-insights.com",
  "frame-src 'self' https://checkout.flutterwave.com https://checkout.paystack.com",
  "frame-ancestors 'self'",
  "form-action 'self' https://checkout.flutterwave.com https://checkout.paystack.com",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
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
  // Report-Only — does not block, only reports. Flip the key name to
  // `Content-Security-Policy` after monitoring violations for 7-14 days.
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
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

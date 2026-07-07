import { serve } from "inngest/next";
import {
  inngest,
  videoPipeline,
  syncSocialMetrics,
  analyzePostPerformance,
  refreshXTokens,
  refreshLinkedInTokens,
  refreshTiktokTokens,
} from "@/src/lib/inngest";

// Inngest verifies request signatures using INNGEST_SIGNING_KEY. Without it
// set, the route would accept unsigned events — anyone who knows the URL
// could trigger functions. Fail loudly in production so a misconfigured
// deploy can't silently accept untrusted events.
if (
  process.env.NODE_ENV === "production" &&
  !process.env.INNGEST_SIGNING_KEY
) {
  throw new Error(
    "INNGEST_SIGNING_KEY is not set in production. Refusing to expose the /api/inngest route without signature verification. Add the key from app.inngest.com to Vercel env vars."
  );
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    videoPipeline,
    syncSocialMetrics,
    analyzePostPerformance,
    refreshXTokens,
    refreshLinkedInTokens,
    refreshTiktokTokens,
  ],
});

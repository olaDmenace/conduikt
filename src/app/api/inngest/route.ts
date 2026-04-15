import { serve } from "inngest/next";
import {
  inngest,
  videoPipeline,
  syncSocialMetrics,
  refreshXTokens,
} from "@/src/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [videoPipeline, syncSocialMetrics, refreshXTokens],
});

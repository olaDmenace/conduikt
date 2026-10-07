import { registerHandler } from "../registry";
import type { ExecutionHandler } from "../types";
import { FIRST_WEEK_AGENT, runFirstWeekAgent } from "@/src/lib/first-week/run";

// Safety net for the "first week" pack: the request that starts the pack
// runs its agents straight away; any row it didn't finish (timeout, crash)
// is still pending and gets picked up here on the next tick.
const handler: ExecutionHandler = (payload, { supabase }) => runFirstWeekAgent(supabase, payload);

registerHandler(FIRST_WEEK_AGENT, handler);

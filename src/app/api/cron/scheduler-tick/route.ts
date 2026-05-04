import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { dispatchDueExecutions } from "@/src/lib/scheduler/dispatcher";
// Importing this file is the side effect that populates the handler
// registry. Must come before dispatchDueExecutions runs.
import "@/src/lib/scheduler/handlers";

// Called every 5 minutes by Supabase pg_cron + pg_net (see migration
// 20260504_scheduled_executions.sql). Pulls pending executions whose
// scheduled_for has passed and dispatches each to its registered handler.
//
// Auth follows the same pattern as /api/cron/publish: CRON_SECRET in either
// the Authorization header or a `?secret=` query param.

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[cron/scheduler-tick] CRON_SECRET is not set — refusing to run. Add it in Vercel env vars."
      );
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }
    console.warn(
      "[cron/scheduler-tick] CRON_SECRET is not set — allowing unauthenticated call (dev only)"
    );
  } else {
    const authHeader = request.headers.get("authorization");
    const queryParamSecret = new URL(request.url).searchParams.get("secret");
    const headerMatches = authHeader === `Bearer ${cronSecret}`;
    const queryMatches = queryParamSecret === cronSecret;
    if (!headerMatches && !queryMatches) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  try {
    const result = await dispatchDueExecutions(supabase);
    if (result.scanned > 0) {
      console.log(
        `[cron/scheduler-tick] scanned=${result.scanned} completed=${result.completed} retried=${result.retried} failed=${result.failed} unhandled=${result.unhandled}`
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[cron/scheduler-tick] dispatch failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

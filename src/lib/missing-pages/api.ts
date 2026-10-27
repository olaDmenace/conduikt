// Shared plumbing for the Missing Pages API routes: owner check, the
// 503 body for an unreachable writing service, and the plan-free error
// shape every route returns.

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import type { ProjectRow } from "./facts";

export const AI_UNAVAILABLE_FALLBACK = "We couldn't reach the writing service. Nothing was charged. Try again in a few minutes.";

export function isAiUnavailableError(err: unknown): err is Error & { userMessage?: string } {
  return err instanceof Error && err.name === "AIUnavailableError";
}

export function aiUnavailableResponse(err: unknown): NextResponse {
  const message = (err as { userMessage?: string } | null)?.userMessage ?? AI_UNAVAILABLE_FALLBACK;
  return NextResponse.json({ error: message, code: "ai_unavailable", retryable: true }, { status: 503 });
}

export type OwnerContext = { supabase: SupabaseClient; userId: string; project: ProjectRow };

/** The signed-in owner of this project, or the response to send instead. */
export async function requireProjectOwner(projectId: string): Promise<OwnerContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return { supabase, userId: user.id, project: project as ProjectRow };
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

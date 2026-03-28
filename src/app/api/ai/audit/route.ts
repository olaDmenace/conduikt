import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { seoAuditSkill } from "@/src/lib/ai/agents/seo-audit";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";

// Force Node.js runtime — Edge runtime can't fetch arbitrary external URLs
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check generation limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generation_count")
    .eq("id", user.id)
    .single();

  const planLimits: Record<string, number> = {
    free: 5,
    pro: 100,
    growth: 999999,
    agency: 999999,
  };
  const limit = planLimits[profile?.plan ?? "free"] ?? 5;
  if ((profile?.generation_count ?? 0) >= limit) {
    return NextResponse.json(
      { error: "Generation limit reached. Upgrade your plan." },
      { status: 429 }
    );
  }

  const { projectId, url } = await request.json();

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch the page HTML
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ConduiktBot/1.0; +https://conduikt.io)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        },
        { status: 400 }
      );
    }

    html = await response.text();

    if (!html || html.length < 50) {
      return NextResponse.json(
        { error: "URL returned empty or very short content" },
        { status: 400 }
      );
    }
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "URL took too long to respond (15s timeout)"
        : "Failed to fetch URL — check the URL is publicly accessible";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Build context and run audit
  const context = buildProjectContext(project);
  const systemPrompt = seoAuditSkill.buildSystemPrompt(context);
  const userPrompt = seoAuditSkill.buildUserPrompt({ url, html });

  let result;
  try {
    result = await generateWithClaude({
      systemPrompt,
      userPrompt,
      model: seoAuditSkill.model,
      maxTokens: seoAuditSkill.maxTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Parse
  let auditData;
  try {
    const parsed = seoAuditSkill.parseResponse(result.content);
    auditData = parsed.data as { score: number; findings: unknown };
  } catch {
    return NextResponse.json(
      { error: "Failed to parse audit results", raw: result.content },
      { status: 500 }
    );
  }

  // Save audit to database
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      project_id: projectId,
      type: "seo",
      url,
      score: auditData.score,
      findings: auditData.findings,
    })
    .select()
    .single();

  if (auditError) {
    return NextResponse.json(
      { error: "Failed to save audit" },
      { status: 500 }
    );
  }

  // Log generation and increment count
  await Promise.all([
    supabase.from("ai_generations").insert({
      project_id: projectId,
      agent_used: "seo-audit",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      model: result.model,
      duration_ms: result.durationMs,
    }),
    supabase
      .from("profiles")
      .update({
        generation_count: (profile?.generation_count ?? 0) + 1,
      })
      .eq("id", user.id),
  ]);

  return NextResponse.json(audit);
}

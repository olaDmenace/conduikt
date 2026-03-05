import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { onboardingAdvisorAgent } from "@/src/lib/ai/agents/onboarding-advisor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, onboarding_answers")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await request.json();
  const answers = body.answers || project.onboarding_answers;

  if (!answers) {
    return NextResponse.json(
      { error: "No onboarding answers found" },
      { status: 400 }
    );
  }

  // Get latest audit score if available
  const { data: latestAudit } = await supabase
    .from("audits")
    .select("score")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const systemPrompt = onboardingAdvisorAgent.buildSystemPrompt({
    websiteUrl: "",
    name: "",
  });

  const userPrompt = `Here are the user's questionnaire answers:
${JSON.stringify(answers, null, 2)}

${latestAudit?.score ? `Their site audit score is: ${latestAudit.score}/100` : "No audit has been run yet."}

Generate personalised setup recommendations.`;

  try {
    const result = await generateWithClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 1500,
    });

    await supabase.from("ai_generations").insert({
      user_id: user.id,
      project_id: id,
      agent_used: "onboarding-advisor",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      model: result.model,
      duration_ms: result.durationMs,
    });

    const plan = JSON.parse(result.content);
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to generate plan", details: String(e) },
      { status: 500 }
    );
  }
}

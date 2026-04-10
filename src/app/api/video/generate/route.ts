import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { generateWithClaude } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";
import { buildPerformanceContext } from "@/src/lib/ai/performance-context";
import { inngest } from "@/src/lib/inngest/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Plan gate — Growth/Agency only
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generation_count")
    .eq("id", user.id)
    .single();

  const allowedPlans = ["growth", "agency"];
  if (!allowedPlans.includes(profile?.plan ?? "free")) {
    return NextResponse.json(
      {
        error:
          "Video Ad generation is available on Growth and Agency plans.",
        upgradeUrl: "/settings/billing",
      },
      { status: 402 }
    );
  }

  const body = await request.json();
  const {
    projectId,
    brief,
    style,
    adLength,
    sourceAssetId,
    videoType,
    avatarMode,
    avatarGender,
  } = body;
  const resolvedVideoType = videoType || style || "presenter";
  const resolvedAvatarMode = resolvedVideoType === "ugc"
    ? (avatarMode || "random")
    : undefined;

  if (!projectId || !brief || brief.length < 50) {
    return NextResponse.json(
      { error: "Project ID and a brief of at least 50 characters required" },
      { status: 400 }
    );
  }

  if (resolvedVideoType === "cinematic") {
    return NextResponse.json(
      { error: "Cinematic mode is coming soon." },
      { status: 400 }
    );
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Generate the script via the video-script agent
  const agent = getAgent("video-script");
  if (!agent) {
    return NextResponse.json(
      { error: "Video script agent not found" },
      { status: 500 }
    );
  }

  const context = buildProjectContext(project);
  const performanceCtx = await buildPerformanceContext(projectId, supabase);
  if (performanceCtx) {
    context.performanceContext = performanceCtx;
  }
  // Inject videoType so buildSystemPrompt can branch on it
  (context as unknown as Record<string, unknown>).__videoType = resolvedVideoType;

  let sourceContent = "";
  if (sourceAssetId) {
    const { data: asset } = await supabase
      .from("assets")
      .select("content")
      .eq("id", sourceAssetId)
      .single();
    if (asset?.content) {
      sourceContent =
        typeof asset.content === "string"
          ? asset.content
          : JSON.stringify(asset.content);
    }
  }

  const systemPrompt = agent.buildSystemPrompt(context);
  const userPrompt = agent.buildUserPrompt({
    brief,
    adLength: adLength || "standard",
    sourceContent,
    videoType: resolvedVideoType,
  });

  const result = await generateWithClaude({
    systemPrompt,
    userPrompt,
    model: agent.model,
    maxTokens: agent.maxTokens,
  });

  let scriptData;
  try {
    const parsed = agent.parseResponse(result.content);
    scriptData = parsed.data;
  } catch {
    scriptData = { raw: result.content };
  }

  // Create video_job record
  const { data: job, error: jobError } = await supabase
    .from("video_jobs")
    .insert({
      user_id: user.id,
      project_id: projectId,
      brief,
      style: resolvedVideoType,
      video_type: resolvedVideoType,
      source_asset_id: sourceAssetId || null,
      script_data: scriptData,
      avatar_mode: resolvedAvatarMode || null,
      selected_avatar_id: null,
      avatar_gender: avatarGender || null,
      status: "scripting",
      progress_message: "Script generated, starting video pipeline...",
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: jobError?.message || "Failed to create video job" },
      { status: 500 }
    );
  }

  // Log generation
  await supabase.from("ai_generations").insert({
    project_id: projectId,
    agent_used: "video-ad",
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    model: result.model,
    duration_ms: result.durationMs,
  });

  await supabase
    .from("profiles")
    .update({ generation_count: (profile?.generation_count ?? 0) + 1 })
    .eq("id", user.id);

  // Trigger durable background pipeline on Inngest
  await inngest.send({
    name: "video/job.created",
    data: { jobId: job.id },
  });

  return NextResponse.json({ jobId: job.id, scriptData });
}

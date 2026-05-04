import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";
import { socialContentSkill } from "@/src/lib/ai/agents/social-content";
import { generateWithClaude } from "@/src/lib/ai/client";
import { enqueueExecution } from "@/src/lib/scheduler/enqueue";

// POST /api/projects/[id]/playbook/auto-execute
// Body: { actionId, title, channel: 'x' | 'linkedin' }
//
// Generates a draft post for the given playbook action, saves it as an
// asset, and (depending on the user's automation_settings for that
// channel) either:
//   - returns 'off'   — no auto-execute; tells the UI to fall back to
//                       opening the tool with the title pre-filled.
//   - queues 'review' — schedules a playbook_action execution
//                       review_hold_hours into the future. User can
//                       cancel from the queue UI before it fires.
//   - queues 'auto'   — schedules the same execution for the next tick
//                       (effectively immediate publish).
//
// The execution handler (see src/lib/scheduler/handlers/playbook-action.ts)
// is what actually inserts the scheduled_posts row that the publish cron
// picks up. We don't publish from here — keeping the pre-publish review
// window honest.

const VALID_CHANNELS = new Set(["x", "linkedin"]);

interface RequestBody {
  actionId?: string;
  title?: string;
  channel?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const { actionId, title, channel } = body;
  if (!actionId || !title || !channel) {
    return NextResponse.json(
      { error: "actionId, title, and channel are required" },
      { status: 400 }
    );
  }
  if (!VALID_CHANNELS.has(channel)) {
    return NextResponse.json(
      {
        error:
          "Auto-execute only supports X and LinkedIn for now. Other channels still open in the editor.",
        code: "UNSUPPORTED_CHANNEL",
      },
      { status: 400 }
    );
  }

  // Per-channel mode. First-time users implicitly use the default row
  // we'd create in /api/automation/settings on read; if they haven't
  // visited that page yet we fall back to the same defaults inline.
  const { data: settings } = await supabase
    .from("automation_settings")
    .select("x_mode, linkedin_mode, review_hold_hours")
    .eq("user_id", user.id)
    .maybeSingle();

  const mode =
    channel === "x"
      ? (settings?.x_mode ?? "auto")
      : (settings?.linkedin_mode ?? "review");
  const holdHours = settings?.review_hold_hours ?? 24;

  if (mode === "off") {
    // UI fallback: tell the client to navigate to the editor with the
    // title pre-filled. We don't do anything server-side.
    return NextResponse.json({
      mode: "off",
      message:
        "Auto-execute is off for this channel. Open the editor to publish manually.",
    });
  }

  // Pull project + profile for the agent's context.
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, website_url, description, target_audience, value_proposition, brand_voice, competitors, keywords, industry, business_description, audience_pain_point, online_channels, brand_voice_example, primary_goal"
    )
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_primary_color")
    .eq("id", user.id)
    .single();

  const context = buildProjectContext(project, profile);

  // Run the social-content agent for this single platform + topic.
  let parsedOutput: { posts?: Array<{ platform: string; text: string; hook?: string; angle?: string }> };
  try {
    const result = await generateWithClaude({
      systemPrompt: socialContentSkill.buildSystemPrompt(context),
      userPrompt: socialContentSkill.buildUserPrompt({
        topic: title,
        platform: channel,
        count: 1,
      }),
      model: "claude-sonnet-4-6",
      maxTokens: 2000,
    });
    parsedOutput = (socialContentSkill.parseResponse(result.content).data as
      | { posts?: Array<{ platform: string; text: string; hook?: string; angle?: string }> }
      | undefined) ?? {};
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "AI generation failed",
      },
      { status: 502 }
    );
  }

  // Pick the first post that matches the requested channel (the agent
  // sometimes outputs multiple for both platforms).
  const post = (parsedOutput.posts ?? []).find(
    (p) => p.platform === channel
  ) ?? parsedOutput.posts?.[0];
  if (!post?.text) {
    return NextResponse.json(
      { error: "AI did not produce usable content for this action" },
      { status: 502 }
    );
  }

  // Save the generated post as a draft asset. This is the row the
  // handler will publish from. Saving it here (rather than in the
  // handler) lets the user edit it from the queue UI before publish.
  const service = createServiceClient();
  const { data: asset, error: assetErr } = await service
    .from("assets")
    .insert({
      project_id: projectId,
      type: "social_content",
      channel,
      title: title.slice(0, 200),
      content: {
        scheduled_text: post.text,
        raw: post.text,
        hook: post.hook ?? null,
        angle: post.angle ?? null,
        source: "playbook_auto_execute",
        playbook_action_id: actionId,
      },
      status: "draft",
    })
    .select("id")
    .single();

  if (assetErr || !asset) {
    return NextResponse.json(
      { error: assetErr?.message ?? "Could not save asset" },
      { status: 500 }
    );
  }

  // Hold = 24h for review mode, immediate (next tick) for auto.
  const delayHours = mode === "review" ? holdHours : 0;
  const scheduledFor = new Date(Date.now() + delayHours * 3600_000);

  const { id: executionId } = await enqueueExecution(service, {
    userId: user.id,
    executionType: "playbook_action",
    payload: {
      assetId: asset.id,
      projectId,
      channel,
      actionId,
      mode,
    },
    scheduledFor,
    idempotencyKey: `playbook-action:${user.id}:${actionId}:${channel}`,
    parentId: asset.id,
    parentType: "playbook_action",
  });

  return NextResponse.json({
    mode,
    asset_id: asset.id,
    execution_id: executionId,
    scheduled_for: scheduledFor.toISOString(),
    message:
      mode === "review"
        ? `Queued for review — publishes in ${holdHours}h unless you cancel from the automation queue.`
        : "Queued — publishes on the next scheduler tick (within 5 minutes).",
  });
}

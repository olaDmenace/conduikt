import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { createBroadcast, sendBroadcast } from "@/src/lib/email/marketing";
import { checkEmailsPerMonthLimit, getUserPlan } from "@/src/lib/email/usage";

// POST /api/projects/[id]/broadcasts/[broadcastId]/send
// Body (optional): { scheduled_for?: ISO timestamp }
//
// Flow:
//   1. Auth + ownership.
//   2. Load broadcast, confirm status='draft'.
//   3. Count subscribed contacts → blocks if 0.
//   4. Plan-gate: user's monthly email quota must cover audience size.
//   5. Status: draft → sending.
//   6. Resend createBroadcast → store resend_broadcast_id.
//   7. Resend sendBroadcast (with optional scheduledAt).
//   8. Status: sending → sent (or failed on Resend error). Increment
//      email_usage_count by audience size; reset reset_at on first send
//      of a new month.
//
// We do NOT charge the user's quota on draft — only on actual send.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; broadcastId: string }> }
) {
  const { id: projectId, broadcastId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: broadcast } = await supabase
    .from("broadcasts")
    .select(
      "id, audience_id, subject, html_body, text_body, from_name, from_email, reply_to, status, scheduled_for, audiences!inner(id, resend_audience_id, project_id)"
    )
    .eq("id", broadcastId)
    .eq("project_id", projectId)
    .single();

  const audience = Array.isArray(broadcast?.audiences) ? broadcast.audiences[0] : broadcast?.audiences;
  if (!broadcast || !audience) {
    return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  }

  if (broadcast.status !== "draft") {
    return NextResponse.json(
      {
        error: `Cannot send a broadcast in '${broadcast.status}' status. Only drafts can be sent.`,
        code: "NOT_DRAFT",
      },
      { status: 409 }
    );
  }
  if (!audience.resend_audience_id) {
    return NextResponse.json(
      { error: "Audience is not synced with Resend." },
      { status: 409 }
    );
  }

  // Pull optional scheduled_for from body (overrides the broadcast field).
  const body = await request.json().catch(() => ({}));
  let scheduledFor: string | undefined;
  if (typeof body?.scheduled_for === "string" && body.scheduled_for.trim()) {
    const dt = new Date(body.scheduled_for);
    if (Number.isNaN(dt.getTime()) || dt <= new Date()) {
      return NextResponse.json(
        { error: "scheduled_for must be a future datetime" },
        { status: 400 }
      );
    }
    scheduledFor = dt.toISOString();
  } else if (broadcast.scheduled_for) {
    scheduledFor = new Date(broadcast.scheduled_for).toISOString();
  }

  // Audience size = subscribed contacts. We don't send to unsubscribed/
  // bounced/complained addresses ever.
  const { count: audienceSize } = await supabase
    .from("audience_contacts")
    .select("id", { count: "exact", head: true })
    .eq("audience_id", broadcast.audience_id)
    .eq("status", "subscribed");

  if (!audienceSize || audienceSize === 0) {
    return NextResponse.json(
      { error: "Audience has no subscribed contacts." },
      { status: 409 }
    );
  }

  // Plan-gate on monthly emails. We charge the full audience size up-front.
  const plan = await getUserPlan(supabase, user.id);
  const usage = await checkEmailsPerMonthLimit(supabase, user.id, plan, audienceSize);
  if (!usage.ok) {
    return NextResponse.json(
      {
        error: `Email quota would be exceeded (${usage.used} used + ${audienceSize} this send > ${usage.limit} on your plan). Upgrade to send more.`,
        code: "PLAN_GATED",
        limits: usage,
      },
      { status: 403 }
    );
  }

  // Use the service client for the status flips so RLS + concurrent edits
  // don't get in the way mid-send.
  const service = createServiceClient();

  // Lock to 'sending' before calling Resend so two parallel send clicks
  // can't double-fire.
  const { data: locked, error: lockErr } = await service
    .from("broadcasts")
    .update({ status: "sending" })
    .eq("id", broadcast.id)
    .eq("status", "draft")
    .select("id")
    .single();
  if (lockErr || !locked) {
    return NextResponse.json(
      { error: "Could not lock broadcast for send (likely already sending)." },
      { status: 409 }
    );
  }

  // Create the broadcast in Resend.
  const fromHeader = `${broadcast.from_name || "Conduikt"} <${broadcast.from_email}>`;
  const resendCreate = await createBroadcast({
    audienceId: audience.resend_audience_id,
    subject: broadcast.subject,
    html: broadcast.html_body,
    text: broadcast.text_body ?? undefined,
    from: fromHeader,
    replyTo: broadcast.reply_to ?? undefined,
    scheduledAt: scheduledFor,
    name: `${broadcast.subject} (${new Date().toISOString().slice(0, 10)})`,
  });

  if (!resendCreate.ok) {
    await service
      .from("broadcasts")
      .update({ status: "failed", error_message: `Resend create failed: ${resendCreate.error}` })
      .eq("id", broadcast.id);
    return NextResponse.json(
      { error: `Resend create failed: ${resendCreate.error}` },
      { status: 502 }
    );
  }

  // Trigger the actual send. Without scheduledAt this fires immediately.
  const resendSend = await sendBroadcast(resendCreate.data.id, scheduledFor);
  if (!resendSend.ok) {
    await service
      .from("broadcasts")
      .update({
        status: "failed",
        resend_broadcast_id: resendCreate.data.id,
        error_message: `Resend send failed: ${resendSend.error}`,
      })
      .eq("id", broadcast.id);
    return NextResponse.json(
      { error: `Resend send failed: ${resendSend.error}` },
      { status: 502 }
    );
  }

  // Success path: mark sent (or scheduled) and bump usage.
  const finalStatus = scheduledFor ? "scheduled" : "sent";
  const sentAt = scheduledFor ? null : new Date().toISOString();

  await service
    .from("broadcasts")
    .update({
      status: finalStatus,
      sent_at: sentAt,
      resend_broadcast_id: resendCreate.data.id,
      totals: { sent: audienceSize },
    })
    .eq("id", broadcast.id);

  // Reset usage counter on first send of a new calendar month.
  const { data: profile } = await service
    .from("profiles")
    .select("email_usage_reset_at")
    .eq("id", user.id)
    .single();
  const now = new Date();
  const resetAt = profile?.email_usage_reset_at ? new Date(profile.email_usage_reset_at) : null;
  const inCurrentMonth =
    resetAt &&
    resetAt.getUTCFullYear() === now.getUTCFullYear() &&
    resetAt.getUTCMonth() === now.getUTCMonth();
  if (!inCurrentMonth) {
    await service
      .from("profiles")
      .update({
        email_usage_count: audienceSize,
        email_usage_reset_at: now.toISOString(),
      })
      .eq("id", user.id);
  } else {
    await service.rpc("increment_email_usage", {
      user_id_param: user.id,
      by_count: audienceSize,
    });
  }

  return NextResponse.json({
    success: true,
    status: finalStatus,
    audience_size: audienceSize,
    resend_broadcast_id: resendCreate.data.id,
    scheduled_for: scheduledFor ?? null,
  });
}

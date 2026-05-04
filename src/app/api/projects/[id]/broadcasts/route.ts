import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { CONDUIKT_SHARED_FROM_EMAIL } from "@/src/lib/email/marketing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/projects/[id]/broadcasts — list broadcasts for this project.
export async function GET(
  _request: NextRequest,
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

  const { data, error } = await supabase
    .from("broadcasts")
    .select(
      "id, audience_id, subject, from_name, from_email, scheduled_for, sent_at, status, totals, created_at, updated_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/projects/[id]/broadcasts — create a draft broadcast.
// Body: {
//   audience_id, subject, html_body, text_body?,
//   from_name?, from_email?, reply_to?, scheduled_for?
// }
//
// Doesn't send — that's POST .../broadcasts/[id]/send. Drafts can be
// edited via PATCH on the single route until they ship.
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

  const body = await request.json().catch(() => ({}));
  const audienceId = typeof body?.audience_id === "string" ? body.audience_id : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const htmlBody = typeof body?.html_body === "string" ? body.html_body : "";
  const textBody = typeof body?.text_body === "string" ? body.text_body : null;
  const fromName = typeof body?.from_name === "string" ? body.from_name.trim() : "";
  const fromEmail =
    typeof body?.from_email === "string" ? body.from_email.trim().toLowerCase() : "";
  const replyTo = typeof body?.reply_to === "string" ? body.reply_to.trim() : null;
  const scheduledFor =
    typeof body?.scheduled_for === "string" && body.scheduled_for.trim()
      ? new Date(body.scheduled_for)
      : null;

  // Validations
  if (!audienceId) {
    return NextResponse.json({ error: "audience_id is required" }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: "subject must be 200 characters or fewer" }, { status: 400 });
  }
  if (!htmlBody.trim()) {
    return NextResponse.json({ error: "html_body is required" }, { status: 400 });
  }
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    return NextResponse.json({ error: "reply_to must be a valid email" }, { status: 400 });
  }
  if (scheduledFor && (Number.isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())) {
    return NextResponse.json(
      { error: "scheduled_for must be a future datetime" },
      { status: 400 }
    );
  }

  // Verify the audience belongs to this project + has a Resend mirror.
  const { data: audience } = await supabase
    .from("audiences")
    .select("id, name, resend_audience_id, project_id")
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .single();
  if (!audience) {
    return NextResponse.json({ error: "Audience not found in this project" }, { status: 404 });
  }
  if (!audience.resend_audience_id) {
    return NextResponse.json(
      { error: "Audience is not synced with Resend. Try recreating it." },
      { status: 409 }
    );
  }

  // Resolve from-email. If the user provided one, it must be a verified
  // domain owned by them. For V1 the verified-domain UI isn't shipped yet,
  // so any user-supplied from_email is rejected — everyone uses the
  // shared sender. Once Day 5 lands the verified-domain check moves here.
  let resolvedFromEmail = CONDUIKT_SHARED_FROM_EMAIL;
  if (fromEmail) {
    // For now: only Conduikt's shared sender is allowed.
    if (fromEmail !== CONDUIKT_SHARED_FROM_EMAIL) {
      return NextResponse.json(
        {
          error:
            "Custom from_email is a Pro+ feature and the verified-domain flow is not live yet. Leave from_email blank to use the shared sender.",
          code: "CUSTOM_DOMAIN_NOT_AVAILABLE",
        },
        { status: 403 }
      );
    }
    resolvedFromEmail = fromEmail;
  }

  // Default from-name to the audience name (acts as the "brand" recipients see).
  const resolvedFromName = fromName || audience.name || "Conduikt";

  const { data, error } = await supabase
    .from("broadcasts")
    .insert({
      audience_id: audienceId,
      project_id: projectId,
      user_id: user.id,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      from_name: resolvedFromName,
      from_email: resolvedFromEmail,
      reply_to: replyTo,
      scheduled_for: scheduledFor ? scheduledFor.toISOString() : null,
      status: "draft",
    })
    .select(
      "id, audience_id, subject, from_name, from_email, reply_to, scheduled_for, status, created_at"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

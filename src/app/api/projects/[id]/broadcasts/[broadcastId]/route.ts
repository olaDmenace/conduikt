import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/projects/[id]/broadcasts/[broadcastId] — single broadcast + audience name.
export async function GET(
  _request: NextRequest,
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

  const { data, error } = await supabase
    .from("broadcasts")
    .select(
      "id, audience_id, subject, html_body, text_body, from_name, from_email, reply_to, scheduled_for, sent_at, status, resend_broadcast_id, error_message, totals, created_at, updated_at, audiences!inner(name)"
    )
    .eq("id", broadcastId)
    .eq("project_id", projectId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/projects/[id]/broadcasts/[broadcastId] — edit a draft.
// Once a broadcast leaves the 'draft' status, edits are rejected — the
// thing is either in flight, sent, or failed and shouldn't be mutated.
export async function PATCH(
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

  const { data: existing } = await supabase
    .from("broadcasts")
    .select("id, status")
    .eq("id", broadcastId)
    .eq("project_id", projectId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      {
        error: `Cannot edit a broadcast in '${existing.status}' status — only drafts are mutable.`,
        code: "NOT_DRAFT",
      },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body?.subject === "string") {
    const subject = body.subject.trim();
    if (!subject) return NextResponse.json({ error: "subject cannot be empty" }, { status: 400 });
    if (subject.length > 200) return NextResponse.json({ error: "subject too long" }, { status: 400 });
    updates.subject = subject;
  }
  if (typeof body?.html_body === "string") {
    if (!body.html_body.trim()) {
      return NextResponse.json({ error: "html_body cannot be empty" }, { status: 400 });
    }
    updates.html_body = body.html_body;
  }
  if (body?.text_body !== undefined) {
    updates.text_body = typeof body.text_body === "string" ? body.text_body : null;
  }
  if (typeof body?.from_name === "string") {
    updates.from_name = body.from_name.trim();
  }
  if (body?.reply_to !== undefined) {
    if (body.reply_to === null || body.reply_to === "") {
      updates.reply_to = null;
    } else if (typeof body.reply_to === "string" && EMAIL_RE.test(body.reply_to)) {
      updates.reply_to = body.reply_to.trim();
    } else {
      return NextResponse.json({ error: "reply_to must be a valid email" }, { status: 400 });
    }
  }
  if (body?.scheduled_for !== undefined) {
    if (body.scheduled_for === null) {
      updates.scheduled_for = null;
    } else {
      const dt = new Date(body.scheduled_for);
      if (Number.isNaN(dt.getTime()) || dt <= new Date()) {
        return NextResponse.json(
          { error: "scheduled_for must be a future datetime" },
          { status: 400 }
        );
      }
      updates.scheduled_for = dt.toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("broadcasts")
    .update(updates)
    .eq("id", broadcastId)
    .eq("project_id", projectId)
    .select(
      "id, audience_id, subject, html_body, text_body, from_name, from_email, reply_to, scheduled_for, status, totals, updated_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/projects/[id]/broadcasts/[broadcastId] — hard delete (drafts
// + cancelled only). Sent broadcasts stay around for analytics / history.
export async function DELETE(
  _request: NextRequest,
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

  const { data: existing } = await supabase
    .from("broadcasts")
    .select("id, status")
    .eq("id", broadcastId)
    .eq("project_id", projectId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  }
  if (existing.status !== "draft" && existing.status !== "cancelled" && existing.status !== "failed") {
    return NextResponse.json(
      {
        error: `Cannot delete a broadcast in '${existing.status}' status. Only drafts, cancelled, and failed broadcasts can be deleted.`,
        code: "NOT_DELETABLE",
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("broadcasts")
    .delete()
    .eq("id", broadcastId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { enqueueExecution } from "@/src/lib/scheduler/enqueue";

// Public POST endpoint for lead-capture forms.
//
// No auth — the form_id is the only credential. The form's `is_active`
// flag is the gate; deleting/disabling the form stops accepting
// submissions immediately.
//
// Request shapes accepted:
//   - JSON: { email, first_name?, last_name?, _hp?: "" }
//   - form-encoded (default browser <form action>): same fields
//
// CORS: returns Access-Control-Allow-Origin: * so the embed JS can post
// from anywhere. The submit endpoint is the only public, cross-origin
// surface in this app.
//
// Anti-spam:
//   1. Honeypot field `_hp` — invisible input populated by bots. If
//      non-empty, return 200 silently (don't reveal the trap).
//   2. Email regex validation.
//
// Side effects on success:
//   - Upsert audience_contact (subscribed; idempotent on email).
//   - If the form has sequence_id, create + enqueue a sequence enrollment.
//   - Bump form.submission_count.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers ?? {}) },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  if (!formId) {
    return corsJson({ error: "Missing form id" }, { status: 400 });
  }

  // Parse body — accept JSON or form-encoded.
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, string> = {};
  try {
    if (contentType.includes("application/json")) {
      const json = await request.json();
      body = (json ?? {}) as Record<string, string>;
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((v, k) => {
        body[k] = v;
      });
    }
  } catch {
    return corsJson({ error: "Invalid body" }, { status: 400 });
  }

  // Honeypot — bots fill this. Real users (and the embed JS) leave it
  // empty/null. Silent ack so the bot doesn't learn.
  if (typeof body._hp === "string" && body._hp.trim() !== "") {
    return corsJson({ ok: true });
  }

  const email = (body.email ?? "").toString().trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return corsJson(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  const firstName = body.first_name?.toString().trim() || null;
  const lastName = body.last_name?.toString().trim() || null;

  const supabase = createServiceClient();

  // Look up the form. is_active gates everything.
  const { data: form } = await supabase
    .from("lead_forms")
    .select(
      "id, user_id, project_id, audience_id, sequence_id, is_active, redirect_url, thank_you_message"
    )
    .eq("id", formId)
    .maybeSingle();

  if (!form || !form.is_active) {
    // Don't leak whether the form exists — same response for both.
    return corsJson({ error: "This form is not accepting submissions." }, { status: 404 });
  }

  // Upsert the contact. The audience_contacts unique index on
  // (audience_id, email) means re-submission of the same email returns
  // the existing row instead of erroring.
  const { data: contact, error: cErr } = await supabase
    .from("audience_contacts")
    .upsert(
      {
        audience_id: form.audience_id,
        email,
        first_name: firstName,
        last_name: lastName,
        status: "subscribed",
      },
      {
        onConflict: "audience_id,email",
        ignoreDuplicates: false,
      }
    )
    .select("id, status, unsubscribe_token")
    .single();

  if (cErr || !contact) {
    return corsJson(
      { error: "Could not save your submission. Please try again." },
      { status: 500 }
    );
  }

  // If the contact is already unsubscribed/bounced, don't reactivate them
  // through a form submit (could be a spammer testing addresses they've
  // suppressed). Treat as silent success — the form said yes, but we
  // don't enroll them.
  const skipEnrollment =
    contact.status !== "subscribed" || !form.sequence_id;

  if (!skipEnrollment && form.sequence_id) {
    // Pick step 1 of the sequence to schedule.
    const { data: firstStep } = await supabase
      .from("email_sequence_steps")
      .select("step_order, delay_hours")
      .eq("sequence_id", form.sequence_id)
      .order("step_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstStep) {
      // Insert enrollment (idempotent via the unique sequence+contact
      // constraint).
      const { data: enrollment } = await supabase
        .from("email_sequence_enrollments")
        .upsert(
          {
            user_id: form.user_id,
            sequence_id: form.sequence_id,
            contact_id: contact.id,
            audience_id: form.audience_id,
          },
          { onConflict: "sequence_id,contact_id", ignoreDuplicates: false }
        )
        .select("id")
        .single();

      if (enrollment) {
        const delayHours = Math.max(0, Number(firstStep.delay_hours ?? 0));
        const scheduledFor = new Date(Date.now() + delayHours * 3600_000);
        await enqueueExecution(supabase, {
          userId: form.user_id,
          executionType: "email_sequence_step",
          payload: {
            enrollmentId: enrollment.id,
            stepOrder: firstStep.step_order,
          },
          scheduledFor,
          idempotencyKey: `seq-step:${enrollment.id}:${firstStep.step_order}`,
          parentId: enrollment.id,
          parentType: "email_sequence_enrollment",
        });
      }
    }
  }

  // Bump the submission counter. Best-effort — we don't fail the user
  // if this RPC errors.
  await supabase.rpc("increment_form_submission", { form_id_param: form.id });

  // Either redirect (server-side; embed JS may also handle redirect on
  // its end if it asked for JSON) or return JSON.
  if (form.redirect_url) {
    return corsJson({ ok: true, redirect: form.redirect_url });
  }
  return corsJson({
    ok: true,
    message: form.thank_you_message,
  });
}

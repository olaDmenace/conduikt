import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { enrollContactInSequence } from "@/src/lib/email/enroll";
import { beginConfirmation } from "@/src/lib/email/confirm";
import { createContact } from "@/src/lib/email/marketing";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

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
//   3. Per-IP rate limit (the only path here that sends an email).
//
// Side effects on success:
//   - New contact: insert as 'subscribed', or as 'pending' when the list
//     has double opt-in on (then email them a confirm link; the email
//     series waits until they confirm).
//   - Existing contact: never changes their status. An unsubscribed,
//     bounced or suppressed address stays that way; a pending one gets
//     the confirmation email again.
//   - Two submits for the same new address at once (double-click, embed
//     retry): the insert that loses the unique index (23505) re-reads the
//     row and takes the existing-contact path, so both get a 200 and only
//     one Resend contact is created (mirroring runs after the insert).
//   - If the form has sequence_id and the contact is subscribed, enrol.
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

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : request.headers.get("x-real-ip") ?? "unknown").trim();
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

  const limited = rateLimit(`form-submit:${formId}:${clientIp(request)}`, { limit: 20, windowSeconds: 600 });
  if (!limited.allowed) return rateLimitResponse(limited);

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

  const { data: audience } = await supabase
    .from("audiences")
    .select("id, name, double_opt_in, resend_audience_id")
    .eq("id", form.audience_id)
    .maybeSingle();
  const doubleOptIn = audience?.double_opt_in === true;

  // Brand name for the confirmation email: the project's client name, then
  // the project name, then the list name.
  async function brandName(): Promise<string> {
    const { data: project } = await supabase
      .from("projects")
      .select("name, client_name")
      .eq("id", form!.project_id)
      .maybeSingle();
    return (project?.client_name ?? "").trim() || (project?.name ?? "").trim() || audience?.name || "us";
  }

  async function findExisting(): Promise<{ id: string; status: string } | null> {
    const { data } = await supabase
      .from("audience_contacts")
      .select("id, status, unsubscribe_token")
      .eq("audience_id", form!.audience_id)
      .eq("email", email)
      .maybeSingle();
    return (data as { id: string; status: string } | null) ?? null;
  }

  // Existing contact? Never flip their status from a public form.
  let existing = await findExisting();

  let contactId = "";
  let contactStatus = "";
  let isNew = false;

  if (!existing) {
    const { data: inserted, error: cErr } = await supabase
      .from("audience_contacts")
      .insert({
        audience_id: form.audience_id,
        email,
        first_name: firstName,
        last_name: lastName,
        status: doubleOptIn ? "pending" : "subscribed",
        pending_sequence_id: doubleOptIn ? form.sequence_id ?? null : null,
        resend_contact_id: null,
      })
      .select("id, status")
      .single();

    if (cErr?.code === "23505") {
      // Lost the race to another submit for the same address: it is the
      // existing contact now, so take that path.
      existing = await findExisting();
    } else if (cErr || !inserted) {
      return corsJson(
        { error: "Could not save your submission. Please try again." },
        { status: 500 }
      );
    } else {
      isNew = true;
      contactId = inserted.id;
      contactStatus = inserted.status;
    }

    if (!isNew && !existing) {
      return corsJson(
        { error: "Could not save your submission. Please try again." },
        { status: 500 }
      );
    }
  }

  if (existing) {
    contactId = existing.id;
    contactStatus = existing.status;
    if (firstName || lastName) {
      await supabase
        .from("audience_contacts")
        .update({
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
        })
        .eq("id", existing.id);
    }
    if (existing.status === "pending") {
      // They signed up again without confirming: send the link again.
      await beginConfirmation(supabase, {
        contactId: existing.id,
        email,
        userId: form.user_id,
        brandName: await brandName(),
      });
    }
  } else if (doubleOptIn) {
    await beginConfirmation(supabase, {
      contactId,
      email,
      userId: form.user_id,
      brandName: await brandName(),
    });
  } else if (audience?.resend_audience_id) {
    // Mirror into Resend only after the local row exists, and only when
    // they're subscribed. Pending people join the Resend audience at
    // confirm time.
    const mirrored = await createContact(audience.resend_audience_id, {
      email,
      first_name: firstName ?? undefined,
      last_name: lastName ?? undefined,
    });
    if (mirrored.ok) {
      await supabase
        .from("audience_contacts")
        .update({ resend_contact_id: mirrored.data.id })
        .eq("id", contactId);
    }
  }

  // Enrol only subscribed people. Pending ones are enrolled when they
  // confirm (confirmContactByToken reads pending_sequence_id).
  if (contactStatus === "subscribed" && form.sequence_id) {
    await enrollContactInSequence(supabase, {
      userId: form.user_id,
      sequenceId: form.sequence_id,
      contactId,
      audienceId: form.audience_id,
    });
  }

  // Bump the submission counter. Best-effort — we don't fail the user
  // if this RPC errors.
  await supabase.rpc("increment_form_submission", { form_id_param: form.id });

  // Either redirect (server-side; embed JS may also handle redirect on
  // its end if it asked for JSON) or return JSON.
  if (form.redirect_url) {
    return corsJson({ ok: true, redirect: form.redirect_url, pending: contactStatus === "pending" });
  }
  return corsJson({
    ok: true,
    message:
      contactStatus === "pending"
        ? "Almost there. Check your inbox and confirm your email."
        : form.thank_you_message,
    pending: contactStatus === "pending",
  });
}

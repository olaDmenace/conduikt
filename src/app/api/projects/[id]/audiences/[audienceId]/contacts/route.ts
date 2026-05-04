import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
import { createContact } from "@/src/lib/email/marketing";
import { checkContactsLimit, getUserPlan } from "@/src/lib/email/usage";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/projects/[id]/audiences/[audienceId]/contacts
//   ?page=1&limit=50&status=subscribed&search=foo
// Returns paginated contact list for the audience.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; audienceId: string }> }
) {
  const { id: projectId, audienceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Confirm the audience belongs to this project.
  const { data: audience } = await supabase
    .from("audiences")
    .select("id")
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .single();
  if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const status = searchParams.get("status");
  const search = (searchParams.get("search") ?? "").trim();

  let query = supabase
    .from("audience_contacts")
    .select(
      "id, email, first_name, last_name, status, custom_fields, subscribed_at, unsubscribed_at, suppression_reason",
      { count: "exact" }
    )
    .eq("audience_id", audienceId)
    .order("subscribed_at", { ascending: false });

  if (status === "subscribed" || status === "unsubscribed" || status === "bounced" || status === "complained") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contacts: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

// POST /api/projects/[id]/audiences/[audienceId]/contacts
// Body: { email, first_name?, last_name?, custom_fields? }
// Adds a single contact. CSV bulk import uses the /import sibling route.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; audienceId: string }> }
) {
  const { id: projectId, audienceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: audience } = await supabase
    .from("audiences")
    .select("id, resend_audience_id")
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .single();
  if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : null;
  const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : null;
  const customFields =
    body?.custom_fields && typeof body.custom_fields === "object"
      ? (body.custom_fields as Record<string, unknown>)
      : {};

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Plan-gating on contact count.
  const plan = await getUserPlan(supabase, user.id);
  const limit = await checkContactsLimit(supabase, audienceId, plan, 1);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Contact limit reached for this audience (${limit.used}/${limit.limit} on your plan). Upgrade to add more.`,
        code: "PLAN_GATED",
        limits: limit,
      },
      { status: 403 }
    );
  }

  // Mirror in Resend. If Resend create fails we still write to Conduikt
  // (resend_contact_id will be null and a future sync job can fix it).
  let resendContactId: string | null = null;
  if (audience.resend_audience_id) {
    const resend = await createContact(audience.resend_audience_id, {
      email,
      first_name: firstName ?? undefined,
      last_name: lastName ?? undefined,
    });
    if (resend.ok) resendContactId = resend.data.id;
    // Resend errors are logged but non-fatal — the contact still saves locally.
    else console.warn(`[contacts] Resend mirror failed for ${email}: ${resend.error}`);
  }

  const { data, error } = await supabase
    .from("audience_contacts")
    .insert({
      audience_id: audienceId,
      email,
      first_name: firstName,
      last_name: lastName,
      custom_fields: customFields,
      resend_contact_id: resendContactId,
      status: "subscribed",
    })
    .select("id, email, first_name, last_name, status, custom_fields, subscribed_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      // unique_violation — email already in this audience
      return NextResponse.json(
        { error: "This email is already in the audience" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

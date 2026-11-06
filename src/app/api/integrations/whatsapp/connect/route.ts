import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { encryptToken } from "@/src/lib/crypto/tokens";
import { GRAPH_BASE } from "@/src/lib/integrations/whatsapp";

// WhatsApp Cloud API has no end-user OAuth dance for a single business:
// the owner creates a system user in Meta Business Manager, generates a
// permanent token with whatsapp_business_messaging, and copies the phone
// number id from the WhatsApp > API Setup page. This route saves those
// two values for a project after checking them against Meta.
//
// GET    /api/integrations/whatsapp/connect?projectId=   current state (no token)
// POST   /api/integrations/whatsapp/connect  { projectId, phoneNumberId, accessToken, businessAccountId? }
// DELETE /api/integrations/whatsapp/connect?projectId=   disconnect

async function ownedProject(projectId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!projectId) {
    return { error: NextResponse.json({ error: "projectId is required" }, { status: 400 }) };
  }
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  return { user, projectId };
}

export async function GET(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get("projectId");
  const auth = await ownedProject(projectId);
  if ("error" in auth) return auth.error;

  const db = createServiceClient();
  const { data } = await db
    .from("connected_accounts")
    .select("platform_user_id, metadata, updated_at")
    .eq("project_id", auth.projectId)
    .eq("platform", "whatsapp")
    .maybeSingle();

  if (!data) {
    return NextResponse.json({
      connected: false,
      reason: "WhatsApp is not connected for this project",
      webhookConfigured: !!process.env.WHATSAPP_VERIFY_TOKEN,
    });
  }
  const meta = (data.metadata ?? {}) as { display_phone_number?: string; business_account_id?: string };
  return NextResponse.json({
    connected: true,
    phoneNumberId: data.platform_user_id,
    displayPhoneNumber: meta.display_phone_number ?? null,
    businessAccountId: meta.business_account_id ?? null,
    updatedAt: data.updated_at,
    webhookConfigured: !!process.env.WHATSAPP_VERIFY_TOKEN,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    phoneNumberId?: string;
    accessToken?: string;
    businessAccountId?: string;
  };
  const auth = await ownedProject(body.projectId ?? null);
  if ("error" in auth) return auth.error;

  const phoneNumberId = body.phoneNumberId?.trim();
  const accessToken = body.accessToken?.trim();
  if (!phoneNumberId || !/^\d{5,30}$/.test(phoneNumberId)) {
    return NextResponse.json({ error: "Phone number id should be the number Meta shows under API Setup." }, { status: 400 });
  }
  if (!accessToken || accessToken.length < 20) {
    return NextResponse.json({ error: "Access token is missing or too short." }, { status: 400 });
  }

  // Check the pair against Meta before saving so a typo fails here, not
  // on the first scheduled message.
  let displayPhoneNumber: string | null = null;
  let verifiedName: string | null = null;
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${phoneNumberId}?${new URLSearchParams({
        fields: "display_phone_number,verified_name,quality_rating",
      })}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = (await res.json().catch(() => ({}))) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `Meta rejected the phone number id or token (${res.status})` },
        { status: 400 }
      );
    }
    displayPhoneNumber = data.display_phone_number ?? null;
    verifiedName = data.verified_name ?? null;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not reach Meta to check the details" },
      { status: 502 }
    );
  }

  const db = createServiceClient();
  const payload = {
    user_id: auth.user.id,
    project_id: auth.projectId,
    platform: "whatsapp" as const,
    access_token: encryptToken(accessToken),
    refresh_token: null,
    token_expires_at: null,
    platform_user_id: phoneNumberId,
    platform_username: verifiedName ?? displayPhoneNumber,
    scope: "whatsapp_business_messaging",
    metadata: {
      display_phone_number: displayPhoneNumber,
      business_account_id: body.businessAccountId?.trim() || null,
    },
  };

  const { data: existing } = await db
    .from("connected_accounts")
    .select("id")
    .eq("project_id", auth.projectId)
    .eq("platform", "whatsapp")
    .maybeSingle();

  const { error: writeError } = existing
    ? await db
        .from("connected_accounts")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await db.from("connected_accounts").insert(payload);

  if (writeError) {
    console.error("[whatsapp/connect] write error:", writeError);
    return NextResponse.json(
      {
        error:
          writeError.code === "23505"
            ? "WhatsApp is already connected on another of your projects. Disconnect there first."
            : "Could not save the WhatsApp connection.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    connected: true,
    phoneNumberId,
    displayPhoneNumber,
    verifiedName,
    webhookConfigured: !!process.env.WHATSAPP_VERIFY_TOKEN,
  });
}

export async function DELETE(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get("projectId");
  const auth = await ownedProject(projectId);
  if ("error" in auth) return auth.error;

  const db = createServiceClient();
  await db
    .from("connected_accounts")
    .delete()
    .eq("project_id", auth.projectId)
    .eq("platform", "whatsapp");
  return NextResponse.json({ ok: true });
}

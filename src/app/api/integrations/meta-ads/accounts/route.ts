import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  fetchAdAccounts,
  getMetaAdsConnection,
  isMetaAdsEnabled,
  META_ADS_WAITING_MESSAGE,
} from "@/src/lib/integrations/meta-ads";

// GET  /api/integrations/meta-ads/accounts?projectId=   list ad accounts
// PATCH /api/integrations/meta-ads/accounts             { projectId, accountId }
// DELETE /api/integrations/meta-ads/accounts?projectId= disconnect
//
// Every response for a project without a connection is a plain
// { connected: false, reason } with status 200, so the card can render it.

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

  if (!isMetaAdsEnabled()) {
    return NextResponse.json({ connected: false, reason: META_ADS_WAITING_MESSAGE });
  }

  const db = createServiceClient();
  const conn = await getMetaAdsConnection(db, auth.projectId);
  if (!conn) {
    return NextResponse.json({
      connected: false,
      reason: "Meta Ads is not connected for this project",
    });
  }

  // Prefer the live list; fall back to what the callback stored.
  const { data: row } = await db
    .from("connected_accounts")
    .select("metadata")
    .eq("id", conn.id)
    .maybeSingle();
  const stored = ((row?.metadata ?? {}) as { accounts?: unknown[] }).accounts ?? [];

  let accounts: unknown[] = stored;
  try {
    accounts = await fetchAdAccounts(conn.accessToken);
  } catch {
    // Keep the stored list; the user can still switch between known ones.
  }

  return NextResponse.json({
    connected: true,
    selectedAccountId: conn.accountId,
    selectedAccountName: conn.accountName,
    accounts,
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    accountId?: string;
    accountName?: string;
  };
  const auth = await ownedProject(body.projectId ?? null);
  if ("error" in auth) return auth.error;
  if (!body.accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: row } = await db
    .from("connected_accounts")
    .select("id, metadata")
    .eq("project_id", auth.projectId)
    .eq("platform", "meta_ads")
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Meta Ads is not connected for this project" }, { status: 400 });
  }

  const metadata = { ...((row.metadata ?? {}) as Record<string, unknown>), ad_account_id: body.accountId };
  const { error } = await db
    .from("connected_accounts")
    .update({
      platform_user_id: body.accountId,
      platform_username: body.accountName ?? null,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, selectedAccountId: body.accountId });
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
    .eq("platform", "meta_ads");
  return NextResponse.json({ ok: true });
}

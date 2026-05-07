import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getValidGscToken } from "@/src/lib/integrations/gsc";

interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

// GSC site picker is project-scoped now. Both GET and PATCH require
// projectId — GET as a query param, PATCH in the body — and we look up
// the connected_accounts row by (project_id, platform), confirming the
// caller owns the project before touching anything.
async function requireGscAccount(projectId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };

  if (!projectId) {
    return {
      error: "projectId is required" as const,
      status: 400 as const,
    };
  }

  // Verify ownership before pulling the connection — same pattern as the
  // GSC sync route.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) {
    return { error: "Project not found" as const, status: 404 as const };
  }

  const db = createServiceClient();
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("project_id", projectId)
    .eq("platform", "gsc")
    .single();

  if (!account) {
    return {
      error: "GSC not connected for this project" as const,
      status: 400 as const,
    };
  }

  return { user, db, account };
}

export async function GET(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get("projectId");
  const ctx = await requireGscAccount(projectId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const accessToken = await getValidGscToken(ctx.account, ctx.db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh GSC token. Please reconnect." },
      { status: 401 }
    );
  }

  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `GSC sites API error ${res.status}: ${msg}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const sites: GscSite[] = (data.siteEntry ?? []).filter(
    (s: GscSite) => s.permissionLevel !== "siteUnverifiedUser"
  );

  return NextResponse.json({
    current: ctx.account.platform_username ?? null,
    sites,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId: string | undefined = body?.projectId;
  const siteUrl: string | undefined = body?.siteUrl;

  const ctx = await requireGscAccount(projectId ?? null);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!siteUrl || typeof siteUrl !== "string") {
    return NextResponse.json(
      { error: "siteUrl is required" },
      { status: 400 }
    );
  }

  // Verify the chosen site is actually one the user has access to.
  // Don't trust the client — confirm against the live GSC sites list.
  const accessToken = await getValidGscToken(ctx.account, ctx.db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh GSC token. Please reconnect." },
      { status: 401 }
    );
  }

  const listRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    return NextResponse.json(
      { error: `GSC sites API error ${listRes.status}` },
      { status: 502 }
    );
  }
  const listData = await listRes.json();
  const verified: string[] = (listData.siteEntry ?? [])
    .filter((s: GscSite) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s: GscSite) => s.siteUrl);

  if (!verified.includes(siteUrl)) {
    return NextResponse.json(
      { error: "That site isn't in your verified GSC properties." },
      { status: 400 }
    );
  }

  const { error } = await ctx.db
    .from("connected_accounts")
    .update({
      platform_username: siteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.account.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ current: siteUrl });
}

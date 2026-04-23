import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getValidGoogleToken } from "@/src/lib/integrations/google-oauth";

interface Ga4PropertySummary {
  property: string;
  displayName: string;
  accountDisplayName?: string;
}

async function requireGa4Account() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };

  const db = createServiceClient();
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "ga4")
    .single();

  if (!account) return { error: "GA4 not connected" as const, status: 400 as const };
  return { user, db, account };
}

export async function GET() {
  const ctx = await requireGa4Account();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const accessToken = await getValidGoogleToken(ctx.account, ctx.db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh Google token. Please reconnect." },
      { status: 401 }
    );
  }

  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `GA4 API error ${res.status}: ${msg}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const properties: Ga4PropertySummary[] = [];
  for (const account of data.accountSummaries ?? []) {
    for (const prop of account.propertySummaries ?? []) {
      properties.push({
        property: prop.property,
        displayName: prop.displayName,
        accountDisplayName: account.displayName,
      });
    }
  }

  return NextResponse.json({
    current: ctx.account.platform_user_id ?? null,
    currentDisplay: ctx.account.platform_username ?? null,
    properties,
  });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireGa4Account();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await request.json().catch(() => ({}));
  const property: string | undefined = body?.property;
  if (!property || typeof property !== "string") {
    return NextResponse.json({ error: "property is required" }, { status: 400 });
  }

  const accessToken = await getValidGoogleToken(ctx.account, ctx.db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh Google token. Please reconnect." },
      { status: 401 }
    );
  }

  // Verify user has access to this property
  const listRes = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    return NextResponse.json(
      { error: `GA4 API error ${listRes.status}` },
      { status: 502 }
    );
  }
  const listData = await listRes.json();
  const accessible: { property: string; displayName: string }[] = [];
  for (const a of listData.accountSummaries ?? []) {
    for (const p of a.propertySummaries ?? []) {
      accessible.push({ property: p.property, displayName: p.displayName });
    }
  }
  const match = accessible.find((p) => p.property === property);
  if (!match) {
    return NextResponse.json(
      { error: "That property isn't in your accessible GA4 properties." },
      { status: 400 }
    );
  }

  const { error } = await ctx.db
    .from("connected_accounts")
    .update({
      platform_user_id: match.property,
      platform_username: match.displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.account.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    current: match.property,
    currentDisplay: match.displayName,
  });
}

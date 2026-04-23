import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getValidGoogleToken } from "@/src/lib/integrations/google-oauth";
import { fetchGa4Summary } from "@/src/lib/integrations/ga4";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: account } = await db
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", "ga4")
    .single();

  if (!account) {
    return NextResponse.json({ error: "GA4 not connected" }, { status: 400 });
  }

  if (!account.platform_user_id) {
    return NextResponse.json(
      { error: "No GA4 property selected. Pick one in Integrations." },
      { status: 400 }
    );
  }

  const accessToken = await getValidGoogleToken(account, db);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh Google token. Please reconnect." },
      { status: 401 }
    );
  }

  const days = Number(
    new URL(request.url).searchParams.get("days") ?? "28"
  );

  try {
    const summary = await fetchGa4Summary(
      account.platform_user_id,
      accessToken,
      isNaN(days) ? 28 : days
    );
    return NextResponse.json({
      property: account.platform_user_id,
      propertyDisplay: account.platform_username,
      days,
      ...summary,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GA4 fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

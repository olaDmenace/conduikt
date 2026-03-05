import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("webhook_configs")
    .select("id, name, type, endpoint_url, active, project_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, type, endpoint_url, auth_token, config, project_id } = body;

  if (!name || !type || !endpoint_url) {
    return NextResponse.json(
      { error: "name, type, and endpoint_url are required" },
      { status: 400 }
    );
  }

  const validTypes = ["wordpress", "webflow", "buffer", "generic"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid webhook type" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("webhook_configs")
    .insert({
      user_id: user.id,
      project_id: project_id || null,
      name,
      type,
      endpoint_url,
      auth_token: auth_token || null,
      config: config || {},
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

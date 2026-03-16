import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: webhook } = await supabase
    .from("webhook_configs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const testPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    source: "conduikt",
    message: "This is a test webhook delivery from Conduikt.",
    data: {
      title: "Test Content",
      body: "If you received this, your webhook integration is working correctly.",
      type: webhook.type,
    },
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Conduikt-Webhooks/1.0",
    };

    if (webhook.auth_token) {
      if (webhook.type === "wordpress") {
        headers["Authorization"] = `Basic ${Buffer.from(webhook.auth_token).toString("base64")}`;
      } else {
        headers["Authorization"] = `Bearer ${webhook.auth_token}`;
      }
    }

    const res = await fetch(webhook.endpoint_url, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      statusText: res.statusText,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Connection failed",
      },
      { status: 502 }
    );
  }
}

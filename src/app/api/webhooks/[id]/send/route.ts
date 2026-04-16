import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { isUrlSafeToFetch } from "@/src/lib/security/validate-url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: webhook } = await supabase
    .from("webhook_configs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!webhook)
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  if (!isUrlSafeToFetch(webhook.endpoint_url)) {
    return NextResponse.json({ error: "Invalid or blocked webhook URL" }, { status: 400 });
  }

  const body = await request.json();
  const { title, content, type } = body;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let payload: unknown;

    switch (webhook.type) {
      case "wordpress":
        headers["Authorization"] = `Basic ${Buffer.from(webhook.auth_token || "").toString("base64")}`;
        payload = {
          title,
          content,
          status: "draft",
        };
        break;

      case "webflow": {
        headers["Authorization"] = `Bearer ${webhook.auth_token}`;
        const collectionId = (webhook.config as Record<string, string>)?.collection_id;
        payload = {
          fields: { name: title, "post-body": content, slug: title?.toLowerCase().replace(/\s+/g, "-") },
          ...(collectionId ? { collectionId } : {}),
        };
        break;
      }

      case "buffer":
        headers["Authorization"] = `Bearer ${webhook.auth_token}`;
        payload = {
          text: content,
          profile_ids: (webhook.config as Record<string, string[]>)?.profile_ids ?? [],
        };
        break;

      case "generic":
      default:
        if (webhook.auth_token) {
          headers["Authorization"] = `Bearer ${webhook.auth_token}`;
        }
        payload = { title, content, type, timestamp: new Date().toISOString() };
        break;
    }

    const res = await fetch(webhook.endpoint_url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Webhook returned ${res.status}: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const detail = process.env.NODE_ENV === "development" ? `: ${String(e)}` : "";
    return NextResponse.json(
      { error: `Failed to send webhook${detail}` },
      { status: 500 }
    );
  }
}

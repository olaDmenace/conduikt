import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  applyWebhook,
  parseWebhookPayload,
  verifyWebhookHandshake,
  verifyWebhookSignature,
} from "@/src/lib/integrations/whatsapp";

// Meta calls this for every WhatsApp event on numbers subscribed to the
// app. Set the callback URL to
//   {NEXT_PUBLIC_APP_URL}/api/integrations/whatsapp/webhook
// in Meta's app dashboard (WhatsApp > Configuration), with the same verify
// token as WHATSAPP_VERIFY_TOKEN, and subscribe to the "messages" field.
//
// GET  = verification handshake (hub.mode, hub.verify_token, hub.challenge)
// POST = statuses (sent/delivered/read/failed) and inbound messages

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const result = verifyWebhookHandshake({
    mode: sp.get("hub.mode"),
    token: sp.get("hub.verify_token"),
    challenge: sp.get("hub.challenge"),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status });
  }
  // Meta expects the bare challenge string back.
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Signature: required whenever the app secret is set. In production
  // with no secret we refuse rather than accept unsigned events.
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (appSecret) {
    if (!verifyWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[whatsapp/webhook] FACEBOOK_APP_SECRET is not set; refusing unsigned webhook.");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseWebhookPayload(body);
  if (parsed.statuses.length === 0 && parsed.messages.length === 0) {
    // Not ours or nothing actionable; still 200 so Meta stops retrying.
    return NextResponse.json({ received: true, applied: 0 });
  }

  try {
    const counts = await applyWebhook(createServiceClient(), parsed);
    return NextResponse.json({ received: true, ...counts });
  } catch (err) {
    // Log and still return 200: Meta retries on non-2xx, and a database
    // hiccup should not turn into a flood of duplicate deliveries.
    console.error("[whatsapp/webhook] apply failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ received: true, applied: 0, error: "Could not store events" });
  }
}

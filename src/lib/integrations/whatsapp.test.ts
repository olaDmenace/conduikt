import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));
vi.mock("@/src/lib/crypto/tokens", () => ({
  decryptToken: <T,>(v: T) => v,
  encryptToken: <T,>(v: T) => v,
  isEncryptionConfigured: () => false,
}));

import {
  normalisePhone,
  buildTemplatePayload,
  sendTemplateMessage,
  sendTextMessage,
  verifyWebhookHandshake,
  verifyWebhookSignature,
  parseWebhookPayload,
  isOptOutMessage,
  applyWebhook,
} from "./whatsapp";

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

describe("normalisePhone", () => {
  it("turns Nigerian local numbers into 234 form", () => {
    expect(normalisePhone("08031234567")).toBe("2348031234567");
    expect(normalisePhone("0803 123 4567")).toBe("2348031234567");
    expect(normalisePhone("0803-123-4567")).toBe("2348031234567");
    expect(normalisePhone("8031234567")).toBe("2348031234567");
  });

  it("strips plus signs and 00 prefixes", () => {
    expect(normalisePhone("+234 803 123 4567")).toBe("2348031234567");
    expect(normalisePhone("+2348031234567")).toBe("2348031234567");
    expect(normalisePhone("002348031234567")).toBe("2348031234567");
    expect(normalisePhone("+44 7700 900123")).toBe("447700900123");
  });

  it("leaves already-international numbers alone", () => {
    expect(normalisePhone("2348031234567")).toBe("2348031234567");
    expect(normalisePhone("14155552671")).toBe("14155552671");
  });

  it("rejects junk", () => {
    expect(normalisePhone("")).toBeNull();
    expect(normalisePhone(null)).toBeNull();
    expect(normalisePhone("call me")).toBeNull();
    expect(normalisePhone("123")).toBeNull();
  });
});

describe("sending", () => {
  const fetchMock = vi.fn();
  const conn = { phoneNumberId: "PNID123", accessToken: "secret-token" };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("builds the template payload Meta expects", () => {
    const payload = buildTemplatePayload(
      {
        to: "0803",
        templateName: "review_request",
        languageCode: "en",
        components: [{ type: "body", parameters: [{ type: "text", text: "Ada" }] }],
      },
      "2348031234567"
    );
    expect(payload).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "2348031234567",
      type: "template",
      template: {
        name: "review_request",
        language: { code: "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Ada" }] }],
      },
    });
  });

  it("posts a template message to the phone number's messages endpoint", async () => {
    fetchMock.mockResolvedValueOnce(json({ messages: [{ id: "wamid.1" }] }));
    const res = await sendTemplateMessage(conn, {
      to: "0803 123 4567",
      templateName: "review_request",
    });
    expect(res).toEqual({ ok: true, messageId: "wamid.1", to: "2348031234567" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://graph.facebook.com/v21.0/PNID123/messages");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer secret-token" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.to).toBe("2348031234567");
    expect(body.type).toBe("template");
    expect(body.template).toEqual({ name: "review_request", language: { code: "en" } });
  });

  it("posts a text message", async () => {
    fetchMock.mockResolvedValueOnce(json({ messages: [{ id: "wamid.2" }] }));
    const res = await sendTextMessage(conn, { to: "+2348031234567", body: "Thanks for your order" });
    expect(res.ok).toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "2348031234567",
      type: "text",
      text: { preview_url: false, body: "Thanks for your order" },
    });
  });

  it("returns Meta's error and code without throwing", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ error: { message: "Message failed to send because more than 24 hours have passed", code: 131047 } }, false, 400)
    );
    const res = await sendTextMessage(conn, { to: "08031234567", body: "hi" });
    expect(res).toEqual({
      ok: false,
      error: "Message failed to send because more than 24 hours have passed",
      code: 131047,
    });
  });

  it("refuses an invalid number before calling Meta", async () => {
    const res = await sendTextMessage(conn, { to: "nope", body: "hi" });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("webhook verify", () => {
  it("echoes the challenge when the token matches", () => {
    const r = verifyWebhookHandshake(
      { mode: "subscribe", token: "my-verify", challenge: "12345" },
      "my-verify"
    );
    expect(r).toEqual({ ok: true, challenge: "12345" });
  });

  it("rejects a wrong token with 403 and a missing env token with 503", () => {
    expect(
      verifyWebhookHandshake({ mode: "subscribe", token: "wrong", challenge: "1" }, "my-verify")
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      verifyWebhookHandshake({ mode: "subscribe", token: "x", challenge: "1" }, undefined)
    ).toMatchObject({ ok: false, status: 503 });
    expect(
      verifyWebhookHandshake({ mode: "unsubscribe", token: "my-verify", challenge: "1" }, "my-verify")
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("validates the sha256 signature over the raw body", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const sig = `sha256=${crypto.createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect(verifyWebhookSignature(body, sig, "app-secret")).toBe(true);
    expect(verifyWebhookSignature(body, sig, "other-secret")).toBe(false);
    expect(verifyWebhookSignature(body, null, "app-secret")).toBe(false);
    expect(verifyWebhookSignature(body, "sha256=short", "app-secret")).toBe(false);
  });
});

const SAMPLE_WEBHOOK = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "2349000000000", phone_number_id: "PNID123" },
            statuses: [
              { id: "wamid.1", status: "delivered", timestamp: "1730000000", recipient_id: "2348031234567" },
              {
                id: "wamid.2",
                status: "failed",
                timestamp: "1730000001",
                recipient_id: "2348031234568",
                errors: [{ code: 131026, title: "Message undeliverable", message: "Receiver is not on WhatsApp" }],
              },
              { id: "wamid.3", status: "weird", timestamp: "1730000002", recipient_id: "x" },
            ],
            contacts: [{ wa_id: "2348031234567", profile: { name: "Ada" } }],
            messages: [
              { id: "wamid.in1", from: "2348031234567", timestamp: "1730000003", type: "text", text: { body: "STOP" } },
              { id: "wamid.in2", from: "2348031234569", timestamp: "1730000004", type: "image", image: { id: "img" } },
            ],
          },
        },
      ],
    },
  ],
};

describe("parseWebhookPayload", () => {
  it("flattens statuses and inbound messages", () => {
    const parsed = parseWebhookPayload(SAMPLE_WEBHOOK);
    expect(parsed.statuses).toHaveLength(2);
    expect(parsed.statuses[0]).toMatchObject({
      phoneNumberId: "PNID123",
      messageId: "wamid.1",
      status: "delivered",
      recipient: "2348031234567",
      occurredAt: new Date(1730000000 * 1000).toISOString(),
      error: null,
    });
    expect(parsed.statuses[1]).toMatchObject({
      status: "failed",
      error: "Receiver is not on WhatsApp",
    });
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0]).toMatchObject({
      messageId: "wamid.in1",
      from: "2348031234567",
      name: "Ada",
      type: "text",
      text: "STOP",
    });
    expect(parsed.messages[1]).toMatchObject({ type: "image", text: null, name: null });
  });

  it("ignores payloads that are not WhatsApp", () => {
    expect(parseWebhookPayload({ object: "page", entry: [] })).toEqual({ statuses: [], messages: [] });
    expect(parseWebhookPayload(null)).toEqual({ statuses: [], messages: [] });
    expect(parseWebhookPayload("junk")).toEqual({ statuses: [], messages: [] });
  });
});

describe("isOptOutMessage", () => {
  it("recognises the usual opt-out words", () => {
    for (const t of ["STOP", "stop", "Stop.", "stop please", "Unsubscribe", "opt out", "Remove me now", "cancel"]) {
      expect(isOptOutMessage(t), t).toBe(true);
    }
  });
  it("does not trip on ordinary replies", () => {
    for (const t of ["Yes please", "How much is it?", "I can't stop laughing", "", null]) {
      expect(isOptOutMessage(t), String(t)).toBe(false);
    }
  });
});

describe("applyWebhook", () => {
  it("records statuses, stores inbound messages and switches consent off on STOP", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const updates: Array<{ table: string; values: Record<string, unknown> }> = [];

    function chain(result: unknown, table: string) {
      const self: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
            if (prop === "insert")
              return (row: Record<string, unknown>) => {
                inserts.push({ table, ...row });
                return chain({ data: null, error: null }, table);
              };
            if (prop === "update")
              return (values: Record<string, unknown>) => {
                updates.push({ table, values });
                return chain({ data: null, error: null }, table);
              };
            return () => self;
          },
        }
      );
      return self;
    }

    const db = {
      from: (table: string) => {
        if (table === "connected_accounts") return chain({ data: { project_id: "proj1" } }, table);
        if (table === "whatsapp_events") return chain({ data: { contact_id: "c1", enrollment_id: "e1" } }, table);
        if (table === "audiences") return chain({ data: [{ id: "aud1" }] }, table);
        if (table === "audience_contacts") return chain({ data: { id: "c1", audience_id: "aud1" } }, table);
        return chain({ data: null }, table);
      },
    } as unknown as Parameters<typeof applyWebhook>[0];

    const counts = await applyWebhook(db, parseWebhookPayload(SAMPLE_WEBHOOK));
    expect(counts).toEqual({ statuses: 2, messages: 2, optOuts: 1, unknownNumbers: 0 });

    const events = inserts.filter((i) => i.table === "whatsapp_events");
    expect(events.map((e) => e.event_type)).toEqual(["delivered", "failed", "received", "opted_out", "received"]);
    expect(events[0]).toMatchObject({ project_id: "proj1", wa_message_id: "wamid.1", contact_id: "c1", enrollment_id: "e1" });
    expect(events[1]).toMatchObject({ body: "Receiver is not on WhatsApp" });

    const consentUpdate = updates.find((u) => u.table === "audience_contacts");
    expect(consentUpdate?.values).toMatchObject({ whatsapp_opt_in: false });
    const enrollmentUpdate = updates.find((u) => u.table === "email_sequence_enrollments");
    expect(enrollmentUpdate?.values).toMatchObject({ status: "cancelled", cancellation_reason: "whatsapp_opt_out" });
  });
});

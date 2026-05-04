import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildUnsubscribeUrl,
  injectUnsubscribeIntoHtml,
  unsubscribeContactByToken,
} from "@/src/lib/email/unsubscribe";

describe("buildUnsubscribeUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.conduikt.com";
    try {
      const url = buildUnsubscribeUrl("abc123");
      expect(url).toBe("https://staging.conduikt.com/unsubscribe?token=abc123");
    } finally {
      if (orig === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = orig;
    }
  });

  it("falls back to conduikt.com when env is unset", () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      const url = buildUnsubscribeUrl("xyz");
      expect(url).toBe("https://conduikt.com/unsubscribe?token=xyz");
    } finally {
      if (orig !== undefined) process.env.NEXT_PUBLIC_APP_URL = orig;
    }
  });

  it("URL-encodes tokens with special characters", () => {
    const url = buildUnsubscribeUrl("a/b+c=d");
    expect(url).toContain("token=a%2Fb%2Bc%3Dd");
  });
});

describe("injectUnsubscribeIntoHtml", () => {
  it("replaces {{{RESEND_UNSUBSCRIBE_URL}}} placeholder", () => {
    const html = `<p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>`;
    const out = injectUnsubscribeIntoHtml(html, "https://x.com/u?t=1");
    expect(out).toBe(`<p><a href="https://x.com/u?t=1">Unsubscribe</a></p>`);
  });

  it("also handles {{RESEND_UNSUBSCRIBE_URL}} (double-brace variant)", () => {
    const html = `<a href="{{RESEND_UNSUBSCRIBE_URL}}">x</a>`;
    const out = injectUnsubscribeIntoHtml(html, "https://x.com");
    expect(out).toBe(`<a href="https://x.com">x</a>`);
  });

  it("appends a footer when no placeholder is present and no </body>", () => {
    const html = `<p>Hello</p>`;
    const out = injectUnsubscribeIntoHtml(html, "https://x.com/u");
    expect(out).toContain("https://x.com/u");
    expect(out).toContain("Unsubscribe");
    // Original content is still there
    expect(out.startsWith("<p>Hello</p>")).toBe(true);
  });

  it("injects footer above </body> when present", () => {
    const html = `<html><body><p>hi</p></body></html>`;
    const out = injectUnsubscribeIntoHtml(html, "https://x.com/u");
    expect(out).toMatch(/Unsubscribe[^<]*<\/a>[\s\S]*<\/div>\s*<\/body>/);
  });

  it("replaces multiple occurrences of the placeholder", () => {
    const html = `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">a</a><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">b</a>`;
    const out = injectUnsubscribeIntoHtml(html, "https://x.com");
    const matches = out.match(/https:\/\/x\.com/g);
    expect(matches?.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// unsubscribeContactByToken
// ---------------------------------------------------------------------------

function buildSupabase(setup: {
  contact?: { data: unknown; error?: unknown };
}) {
  const updateMock = vi.fn().mockReturnThis();
  const eqUpdateMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const enrollmentEqMock = vi.fn().mockReturnThis();
  const enrollmentEqEqMock = vi.fn().mockResolvedValue({ data: null, error: null });

  // Two tables: audience_contacts (select + update) and
  // email_sequence_enrollments (update). We dispatch by table name.
  const fromMock = vi.fn((table: string) => {
    if (table === "audience_contacts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(setup.contact ?? { data: null }),
        update: () => ({ eq: eqUpdateMock }),
      };
    }
    if (table === "email_sequence_enrollments") {
      return {
        update: () => ({
          eq: () => ({
            eq: enrollmentEqEqMock,
          }),
        }),
      };
    }
    return {};
  });

  return {
    from: fromMock,
    _eqUpdateMock: eqUpdateMock,
    _enrollmentEqEqMock: enrollmentEqEqMock,
    _updateMock: updateMock,
    _enrollmentEqMock: enrollmentEqMock,
  };
}

describe("unsubscribeContactByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty token", async () => {
    const sb = buildSupabase({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await unsubscribeContactByToken(sb as any, "");
    expect(r).toMatchObject({ ok: false, error: "Missing token" });
  });

  it("returns invalid-token when no contact matches", async () => {
    const sb = buildSupabase({ contact: { data: null } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await unsubscribeContactByToken(sb as any, "nope");
    expect(r).toMatchObject({ ok: false, error: "Invalid token" });
  });

  it("is idempotent for already-unsubscribed contacts", async () => {
    const sb = buildSupabase({
      contact: {
        data: { id: "c1", audience_id: "a1", status: "unsubscribed" },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await unsubscribeContactByToken(sb as any, "tok");
    expect(r).toEqual({ ok: true, alreadyUnsubscribed: true });
    // Should NOT have called the update path.
    expect(sb._eqUpdateMock).not.toHaveBeenCalled();
  });

  it("flips a subscribed contact to unsubscribed and cancels enrollments", async () => {
    const sb = buildSupabase({
      contact: { data: { id: "c1", audience_id: "a1", status: "subscribed" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await unsubscribeContactByToken(sb as any, "tok");
    expect(r).toEqual({ ok: true, alreadyUnsubscribed: false });
    expect(sb._eqUpdateMock).toHaveBeenCalled();
    expect(sb._enrollmentEqEqMock).toHaveBeenCalled();
  });
});

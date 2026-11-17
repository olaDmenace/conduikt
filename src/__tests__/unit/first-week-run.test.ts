// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// runFirstWeekAgent / runFirstWeekRows: the Site Audit must never score a
// page that was not read. When the pack was queued with no markup, the row
// reads the site again; if it is still unreadable the row fails with the
// "site_unreachable" code and the stored message, and no model call is made.
// ---------------------------------------------------------------------------

const generate = vi.fn();
vi.mock("@/src/lib/ai/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/ai/client")>();
  return { ...actual, generateWithClaudeCompletion: (...args: unknown[]) => generate(...args) };
});

const fetchSignal = vi.fn();
vi.mock("@/src/lib/onboarding/magic-audit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/onboarding/magic-audit")>();
  return { ...actual, fetchPageSignal: (...args: unknown[]) => fetchSignal(...args) };
});

import { runFirstWeekAgent, runFirstWeekRows, SITE_UNREACHABLE } from "@/src/lib/first-week/run";
import type { PageSignal } from "@/src/lib/onboarding/magic-audit";

const URL_ = "https://acme.com/";
const unreachable: PageSignal = { url: URL_, title: null, metaDescription: null, h1: null, bodyText: "", html: "", fetchOk: false, fetchStatus: 403, fetchError: "403 blocked by bot protection", blocked: true };
const readable: PageSignal = { url: URL_, title: "Acme", metaDescription: null, h1: "Acme", bodyText: "Acme widgets", html: "<html><title>Acme</title><h1>Acme</h1></html>", fetchOk: true, fetchStatus: 200, fetchError: null, blocked: false };

const payload = { projectId: "proj-1", agentId: "seo-audit", title: "Site Audit · acme.com", input: { url: URL_, html: "", pageSpeed: null } };

const auditReply = {
  content: JSON.stringify({ score: 81, findings: [{ severity: "warning", category: "meta", title: "Short title", detail: "", fix: "", impact: "medium" }], summary: "Fine." }),
  model: "claude-opus-5-5",
  inputTokens: 10,
  outputTokens: 10,
  durationMs: 5,
  stopReason: "end_turn",
};

/** Enough of a database for one project row and the scheduled_executions updates the runner makes. */
function fakeDb() {
  const executions: Record<string, Record<string, unknown>> = {
    "row-1": { id: "row-1", status: "pending", attempts: 0, max_attempts: 2, payload },
  };
  const inserted: Array<{ table: string; row: unknown }> = [];
  const from = (table: string) => {
    if (table === "projects") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "proj-1", user_id: "u-1", name: "Acme", website_url: URL_ } }) }) }) };
    }
    if (table === "profiles") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    }
    if (table === "ai_generations" || table === "audits") {
      return { insert: async (row: unknown) => (inserted.push({ table, row }), { error: null }) };
    }
    if (table === "scheduled_executions") {
      return {
        update: (patch: Record<string, unknown>) => {
          const filters: Array<[string, unknown]> = [];
          const b = {
            eq: (k: string, v: unknown) => (filters.push([k, v]), b),
            select: () => b,
            maybeSingle: async () => {
              const row = Object.values(executions).find((r) => filters.every(([k, v]) => r[k] === v));
              if (!row) return { data: null };
              Object.assign(row, patch);
              return { data: row };
            },
            then: (res: (v: unknown) => void) => {
              for (const row of Object.values(executions)) if (filters.every(([k, v]) => row[k] === v)) Object.assign(row, patch);
              res({ data: null, error: null });
            },
          };
          return b;
        },
      };
    }
    throw new Error(`unexpected table ${table}`);
  };
  return { supabase: { from } as never, executions, inserted };
}

beforeEach(() => {
  vi.clearAllMocks();
  generate.mockResolvedValue(auditReply);
});

describe("runFirstWeekAgent (Site Audit)", () => {
  it("does not run the audit on an empty page: reads the site again and fails with site_unreachable", async () => {
    const { supabase } = fakeDb();
    const out = await runFirstWeekAgent(supabase, payload, { fetchSignal: async () => unreachable });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.errorCode).toBe(SITE_UNREACHABLE);
    expect(out.retryable).toBe(false);
    expect(out.reason).toBe("blocked");
    expect(out.error).toBe("We couldn't read acme.com (status 403). It looks like your site's bot protection blocked us. Allow the user agent ConduiktBot and try again.");
    expect(generate).not.toHaveBeenCalled();
  });

  it("guards the page agent the same way, since it reads the markup too", async () => {
    const { supabase } = fakeDb();
    const out = await runFirstWeekAgent(supabase, { ...payload, agentId: "page-cro", input: { url: URL_, html: "", context: "Acme" } }, { fetchSignal: async () => unreachable });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.errorCode).toBe(SITE_UNREACHABLE);
    expect(generate).not.toHaveBeenCalled();
  });

  it("treats a read that came back with no markup as unreadable, whatever fetchOk says", async () => {
    const { supabase } = fakeDb();
    const empty: PageSignal = { ...readable, html: "   ", bodyText: "", title: null, h1: null, fetchOk: true, fetchStatus: 200 };
    const out = await runFirstWeekAgent(supabase, payload, { fetchSignal: async () => empty });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.errorCode).toBe(SITE_UNREACHABLE);
    expect(out.reason).toBe("unreachable");
    expect(out.error).toBe("We couldn't read acme.com right now (status 200). Try again in a few minutes.");
    expect(generate).not.toHaveBeenCalled();
  });

  it("runs the audit on the fresh markup when the second read succeeds", async () => {
    const { supabase, inserted } = fakeDb();
    const out = await runFirstWeekAgent(supabase, payload, { fetchSignal: async () => readable });
    expect(out.ok).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    const call = generate.mock.calls[0][0] as { userPrompt: string };
    expect(call.userPrompt).toContain("<h1>Acme</h1>");
    expect(inserted.some((i) => i.table === "audits")).toBe(true);
  });

  it("uses the markup it was given without reading the site again", async () => {
    const { supabase } = fakeDb();
    const spy = vi.fn(async () => unreachable);
    const out = await runFirstWeekAgent(supabase, { ...payload, input: { ...payload.input, html: readable.html } }, { fetchSignal: spy });
    expect(out.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("leaves the agents that work from the brief alone", async () => {
    const { supabase } = fakeDb();
    generate.mockResolvedValue({ ...auditReply, content: JSON.stringify({ keywords: [] }) });
    const spy = vi.fn(async () => unreachable);
    await runFirstWeekAgent(supabase, { projectId: "proj-1", agentId: "keyword-research", input: { seedKeyword: "acme", industry: "widgets" } }, { fetchSignal: spy });
    expect(spy).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe("runFirstWeekRows", () => {
  it("stores the failed row with the code in result and the message in last_error, without a second attempt", async () => {
    fetchSignal.mockResolvedValue(unreachable);
    const { supabase, executions } = fakeDb();
    await runFirstWeekRows(supabase, ["row-1"]);
    const row = executions["row-1"];
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(1);
    expect(row.result).toEqual({ errorCode: SITE_UNREACHABLE, reason: "blocked" });
    expect(String(row.last_error)).toContain("bot protection");
    expect(row.completed_at).toBeTruthy();
    expect(fetchSignal).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
  });
});

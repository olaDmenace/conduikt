import { describe, it, expect } from "vitest";
import { scoreLead, lastActivityOf, isFromForm, SCORE_RULES, RECENT_ACTIVITY_DAYS } from "@/src/lib/leads/score";

const NOW = new Date("2026-11-17T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("scoreLead", () => {
  it("the rules add up to exactly 100", () => {
    expect(Object.values(SCORE_RULES).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("a bare, old, unsubscribed contact scores 0", () => {
    const { score, reasons } = scoreLead({ status: "unsubscribed", created_at: daysAgo(60) }, NOW);
    expect(score).toBe(0);
    expect(reasons).toEqual([]);
  });

  it("a fresh subscriber scores recency + subscribed", () => {
    const { score, reasons } = scoreLead({ status: "subscribed", subscribed_at: daysAgo(1) }, NOW);
    expect(score).toBe(SCORE_RULES.recentActivity + SCORE_RULES.subscribed);
    expect(reasons).toContain(`Active in the last ${RECENT_ACTIVITY_DAYS} days`);
  });

  it("every rule together scores 100", () => {
    const { score } = scoreLead(
      {
        phone: "2348031234567",
        whatsapp_opt_in: true,
        lead_source: "form",
        last_reply_at: daysAgo(2),
        status: "subscribed",
      },
      NOW
    );
    expect(score).toBe(100);
  });

  it("gives +15 for a phone and +15 for WhatsApp consent, separately", () => {
    const base = { status: "unsubscribed", created_at: daysAgo(30) };
    expect(scoreLead({ ...base, phone: "0803 123 4567" }, NOW).score).toBe(SCORE_RULES.hasPhone);
    expect(scoreLead({ ...base, phone: "   " }, NOW).score).toBe(0);
    expect(scoreLead({ ...base, whatsapp_opt_in: true }, NOW).score).toBe(SCORE_RULES.whatsappOptIn);
  });

  it("only 'form' counts as a form source", () => {
    expect(isFromForm("form")).toBe(true);
    expect(isFromForm(" Form ")).toBe(true);
    expect(isFromForm("import")).toBe(false);
    expect(isFromForm(null)).toBe(false);
    const base = { status: "unsubscribed", created_at: daysAgo(30) };
    expect(scoreLead({ ...base, lead_source: "form" }, NOW).score).toBe(SCORE_RULES.fromForm);
    expect(scoreLead({ ...base, lead_source: "import" }, NOW).score).toBe(0);
  });

  it("a reply is worth +25 and makes the lead recently active if it was recent", () => {
    const base = { status: "unsubscribed", created_at: daysAgo(60) };
    expect(scoreLead({ ...base, last_reply_at: daysAgo(20) }, NOW).score).toBe(SCORE_RULES.replied);
    expect(scoreLead({ ...base, last_reply_at: daysAgo(3) }, NOW).score).toBe(SCORE_RULES.replied + SCORE_RULES.recentActivity);
  });

  it("recency uses a 7-day window on the latest activity, including email events", () => {
    const base = { status: "unsubscribed", created_at: daysAgo(60) };
    expect(scoreLead({ ...base, subscribed_at: daysAgo(7) }, NOW).score).toBe(SCORE_RULES.recentActivity);
    expect(scoreLead({ ...base, subscribed_at: daysAgo(8) }, NOW).score).toBe(0);
    expect(scoreLead({ ...base, subscribed_at: daysAgo(40), lastEventAt: daysAgo(1) }, NOW).score).toBe(SCORE_RULES.recentActivity);
  });

  it("ignores unparseable dates", () => {
    const { score, lastActivityAt } = scoreLead({ status: "unsubscribed", last_reply_at: "not a date", created_at: "nope" }, NOW);
    expect(score).toBe(0);
    expect(lastActivityAt).toBeNull();
  });
});

describe("lastActivityOf", () => {
  it("picks the most recent of the known timestamps", () => {
    expect(
      lastActivityOf({
        created_at: daysAgo(30),
        subscribed_at: daysAgo(30),
        stage_changed_at: daysAgo(10),
        last_reply_at: daysAgo(12),
        lastEventAt: daysAgo(5),
      })
    ).toBe(daysAgo(5));
  });

  it("is null when nothing is dated", () => {
    expect(lastActivityOf({})).toBeNull();
  });
});

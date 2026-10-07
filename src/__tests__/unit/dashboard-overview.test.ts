import { describe, it, expect } from "vitest";
import {
  dailySeries,
  percentDelta,
  pointDelta,
  statusLine,
  whenLabel,
  windowedImpressions,
  windowedOpenRate,
} from "@/src/lib/dashboard/overview";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("windowedImpressions", () => {
  it("splits posts into this week and last week by when they went out", () => {
    const rows = [
      { postedAt: daysAgo(1), channel: "x", impressions: 100 },
      { postedAt: daysAgo(6.9), channel: "linkedin", impressions: 50 },
      { postedAt: daysAgo(8), channel: "x", impressions: 70 },
      { postedAt: daysAgo(20), channel: "x", impressions: 999 },
    ];
    expect(windowedImpressions(rows, NOW)).toEqual({ current: 150, previous: 70 });
  });

  it("ignores future and unparseable dates", () => {
    const rows = [
      { postedAt: daysAgo(-1), channel: "x", impressions: 5 },
      { postedAt: "", channel: "x", impressions: 5 },
    ];
    expect(windowedImpressions(rows, NOW)).toEqual({ current: 0, previous: 0 });
  });
});

describe("dailySeries", () => {
  it("buckets one channel oldest-first", () => {
    const rows = [
      { postedAt: daysAgo(0.5), channel: "x", impressions: 10 },
      { postedAt: daysAgo(2.5), channel: "x", impressions: 4 },
      { postedAt: daysAgo(0.5), channel: "linkedin", impressions: 99 },
    ];
    expect(dailySeries(rows, "x", NOW, 4)).toEqual([0, 4, 0, 10]);
  });
});

describe("windowedOpenRate", () => {
  it("computes open rate per 30-day window from broadcast totals", () => {
    const rows = [
      { sentAt: daysAgo(3), totals: { delivered: 200, opened: 50 } },
      { sentAt: daysAgo(10), totals: { delivered: 100, opened: 25 } },
      { sentAt: daysAgo(40), totals: { delivered: 100, opened: 40 } },
      { sentAt: null, totals: { delivered: 1000, opened: 1000 } },
    ];
    expect(windowedOpenRate(rows, NOW)).toEqual({ current: 25, previous: 40, delivered: 300 });
  });

  it("returns null rates when nothing was delivered", () => {
    expect(windowedOpenRate([], NOW)).toEqual({ current: null, previous: null, delivered: 0 });
  });
});

describe("deltas always carry a sign", () => {
  it("percentDelta", () => {
    expect(percentDelta(120, 100, "last week")).toEqual({ text: "+20% vs last week", tone: "up" });
    expect(percentDelta(80, 100, "last week")).toEqual({ text: "−20% vs last week", tone: "down" });
    expect(percentDelta(100, 100, "last week")?.tone).toBe("flat");
    expect(percentDelta(50, 0, "last week")).toBeNull();
  });

  it("pointDelta", () => {
    expect(pointDelta(87, 83, "since last audit").text).toBe("+4 points since last audit");
    expect(pointDelta(82, 83, "since last audit").text).toBe("−1 point since last audit");
  });
});

describe("statusLine", () => {
  it("reads like the spec", () => {
    expect(statusLine(1, 7)).toBe("One run live, seven drafts waiting for you.");
    expect(statusLine(0, 1)).toBe("One draft waiting for you.");
    expect(statusLine(0, 0)).toBe("Nothing needs you right now.");
    expect(statusLine(12, 0)).toBe("12 runs live.");
  });
});

describe("whenLabel", () => {
  it("formats relative times", () => {
    expect(whenLabel(new Date(NOW + 30 * 60_000).toISOString(), NOW)).toBe("in 30 min");
    expect(whenLabel(new Date(NOW + 3 * 3_600_000).toISOString(), NOW)).toBe("in 3 hours");
    expect(whenLabel(new Date(NOW + 2 * 86_400_000).toISOString(), NOW)).toBe("in 2 days");
    expect(whenLabel(new Date(NOW - 1000).toISOString(), NOW)).toBe("due now");
  });
});

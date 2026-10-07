// Pure helpers behind /api/dashboard/overview. Kept free of Supabase so the
// KPI maths can be unit-tested: docs/DESIGN.md §Overview — every number
// says what it counts, every delta carries a sign, no bare dashes.

const DAY = 24 * 60 * 60 * 1000;

export interface PostedMetric {
  postedAt: string;
  channel: string;
  impressions: number;
}

/** Sum impressions for posts published in [now - days, now) and the window before it. */
export function windowedImpressions(rows: PostedMetric[], now: number, days = 7) {
  let current = 0;
  let previous = 0;
  for (const r of rows) {
    const t = Date.parse(r.postedAt);
    if (Number.isNaN(t)) continue;
    const age = now - t;
    if (age < 0) continue;
    if (age < days * DAY) current += r.impressions;
    else if (age < 2 * days * DAY) previous += r.impressions;
  }
  return { current, previous };
}

/** Daily impressions for one channel, oldest first, `days` buckets long. */
export function dailySeries(rows: PostedMetric[], channel: string, now: number, days = 14): number[] {
  const out = new Array<number>(days).fill(0);
  for (const r of rows) {
    if (r.channel !== channel) continue;
    const age = Math.floor((now - Date.parse(r.postedAt)) / DAY);
    if (age >= 0 && age < days) out[days - 1 - age] += r.impressions;
  }
  return out;
}

export interface BroadcastTotals {
  sentAt: string | null;
  totals: { delivered?: number; opened?: number } | null;
}

/** Open rate (0-100) over broadcasts sent in the last `days`, and the window before. */
export function windowedOpenRate(rows: BroadcastTotals[], now: number, days = 30) {
  const acc = { cur: { d: 0, o: 0 }, prev: { d: 0, o: 0 } };
  for (const r of rows) {
    if (!r.sentAt) continue;
    const age = now - Date.parse(r.sentAt);
    const bucket = age >= 0 && age < days * DAY ? acc.cur : age < 2 * days * DAY ? acc.prev : null;
    if (!bucket) continue;
    bucket.d += r.totals?.delivered ?? 0;
    bucket.o += r.totals?.opened ?? 0;
  }
  const rate = (b: { d: number; o: number }) => (b.d > 0 ? Math.round((b.o / b.d) * 100) : null);
  return { current: rate(acc.cur), previous: rate(acc.prev), delivered: acc.cur.d };
}

/** "+12% vs last week" style delta. Returns null when there is no baseline. */
export function percentDelta(current: number, previous: number, period: string) {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)}% vs ${period}`,
    tone: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("flat" as const),
  };
}

/** Point delta for scores and rates: "+4 points since last audit". */
export function pointDelta(current: number, previous: number, suffix: string) {
  const d = current - previous;
  return {
    text: `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)} ${Math.abs(d) === 1 ? "point" : "points"} ${suffix}`,
    tone: d > 0 ? ("up" as const) : d < 0 ? ("down" as const) : ("flat" as const),
  };
}

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** The greeting's one-line status: "One run live, seven drafts waiting for you". */
export function statusLine(live: number, waiting: number): string {
  const parts: string[] = [];
  if (live > 0) parts.push(`${word(live).toLowerCase()} ${live === 1 ? "run" : "runs"} live`);
  if (waiting > 0) parts.push(`${word(waiting).toLowerCase()} ${waiting === 1 ? "draft" : "drafts"} waiting for you`);
  if (parts.length === 0) return "Nothing needs you right now.";
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

/** Relative time for the next publish cell: "in 3 hours", "tomorrow, 09:00". */
export function whenLabel(iso: string, now: number): string {
  const t = Date.parse(iso);
  const diff = t - now;
  if (diff < 0) return "due now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

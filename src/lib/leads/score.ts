// Rule-based lead score, 0 to 100, computed on read from the contact row.
// Nothing is stored: changing a rule changes every score at once.
//
// The rules (they add up to exactly 100):
//
//   +15  has a phone number           we can call or message them
//   +15  agreed to WhatsApp messages  they said yes to hearing from us
//   +20  came from a sign-up form     they came looking, not imported
//   +25  has replied at least once    a real conversation exists
//   +15  active in the last 7 days    the lead is warm right now
//   +10  still subscribed             they haven't opted out
//
// "Active" means the most recent of: last reply, stage change, WhatsApp
// opt-in, sign-up, or latest email event (opened, clicked...) the caller
// passes in as lastEventAt.

export const SCORE_RULES = {
  hasPhone: 15,
  whatsappOptIn: 15,
  fromForm: 20,
  replied: 25,
  recentActivity: 15,
  subscribed: 10,
} as const;

export const RECENT_ACTIVITY_DAYS = 7;

export interface ScorableContact {
  phone?: string | null;
  whatsapp_opt_in?: boolean | null;
  whatsapp_opt_in_at?: string | null;
  lead_source?: string | null;
  last_reply_at?: string | null;
  stage_changed_at?: string | null;
  subscribed_at?: string | null;
  created_at?: string | null;
  status?: string | null;
  /** Latest email event (opened, clicked, delivered...) for this contact, if the caller looked it up. */
  lastEventAt?: string | null;
}

export interface ScoreBreakdown {
  score: number;
  reasons: string[];
  lastActivityAt: string | null;
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** The most recent thing that happened with this contact, or null. */
export function lastActivityOf(contact: ScorableContact): string | null {
  const candidates = [
    contact.last_reply_at,
    contact.stage_changed_at,
    contact.whatsapp_opt_in_at,
    contact.lastEventAt,
    contact.subscribed_at,
    contact.created_at,
  ];
  let best: { t: number; raw: string } | null = null;
  for (const raw of candidates) {
    const t = toTime(raw);
    if (t !== null && (best === null || t > best.t)) best = { t, raw: raw as string };
  }
  return best ? new Date(best.t).toISOString() : null;
}

/** A contact "came from a form" when its source says so. */
export function isFromForm(source: string | null | undefined): boolean {
  return (source ?? "").trim().toLowerCase() === "form";
}

export function scoreLead(contact: ScorableContact, now: Date = new Date()): ScoreBreakdown {
  let score = 0;
  const reasons: string[] = [];

  if (contact.phone && contact.phone.trim()) {
    score += SCORE_RULES.hasPhone;
    reasons.push("Has a phone number");
  }
  if (contact.whatsapp_opt_in === true) {
    score += SCORE_RULES.whatsappOptIn;
    reasons.push("Said yes to WhatsApp");
  }
  if (isFromForm(contact.lead_source)) {
    score += SCORE_RULES.fromForm;
    reasons.push("Came from a sign-up form");
  }
  if (toTime(contact.last_reply_at) !== null) {
    score += SCORE_RULES.replied;
    reasons.push("Has replied");
  }

  const lastActivityAt = lastActivityOf(contact);
  const lastT = toTime(lastActivityAt);
  if (lastT !== null && now.getTime() - lastT <= RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000 && lastT <= now.getTime() + 60_000) {
    score += SCORE_RULES.recentActivity;
    reasons.push(`Active in the last ${RECENT_ACTIVITY_DAYS} days`);
  }
  if ((contact.status ?? "subscribed") === "subscribed") {
    score += SCORE_RULES.subscribed;
    reasons.push("Still subscribed");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, lastActivityAt };
}

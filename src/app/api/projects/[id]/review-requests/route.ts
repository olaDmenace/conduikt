import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import {
  CSV_MAX_ROWS,
  listReviewRequests,
  parseReviewCsv,
  reviewLinkProblem,
  reviewUrlOf,
  sendReviewRequest,
  sendReviewRequests,
  type ReviewRequestRow,
} from "@/src/lib/reviews/send";
import { planOfUser, reviewAllowance, reviewAllowanceMessage, REVIEW_PLAN_MESSAGE } from "@/src/lib/reviews/access";
import {
  REVIEW_REQUESTS_PER_HOUR,
  REVIEW_ROWS_PER_HOUR,
  REVIEW_WINDOW_SECONDS,
  takeRateLimit,
} from "@/src/lib/reviews/limits";

// GET  /api/projects/{id}/review-requests          the list, newest first
// POST /api/projects/{id}/review-requests          "job done": ask one customer
//        { name, email?, phone?, channel?, contactId? }
//      or many at once from a pasted list:
//        { csv: "name,email,phone\n..." }
//
// Every customer gets the same ask; nothing here looks at sentiment.
// Needs a Google review link on the project (set in Settings) or it
// answers 400. Free accounts get FREE_REVIEW_REQUESTS_PER_MONTH asks a
// month across their projects and then 402 with an upgrade message;
// Local and above have no cap. A paste over CSV_MAX_ROWS is refused
// with 400 rather than trimmed.
//
// A paste of CSV_MAX_ROWS customers is sent inside this request: emails
// in batches, WhatsApp one by one with a gap. Give it the long budget.
export const maxDuration = 300;

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional()
  );

const OneSchema = z.object({
  name: z.string({ error: "Customer name is required" }).trim().min(1, "Customer name is required").max(120),
  email: optionalText(254),
  phone: optionalText(40),
  channel: z.enum(["email", "whatsapp"]).nullable().optional(),
  contactId: z.uuid().nullable().optional(),
});

const ManySchema = z.object({
  csv: z.string().min(1, "Paste at least one line").max(60_000, "That paste is too long"),
});

const BodySchema = z.union([ManySchema, OneSchema]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  try {
    const [requests, plan] = await Promise.all([listReviewRequests(ctx.supabase, id), planOfUser(ctx.supabase, ctx.userId)]);
    const allowance = await reviewAllowance(ctx.supabase, ctx.userId, plan);
    const canSend = allowance === null || allowance.remaining > 0;
    return NextResponse.json({
      reviewUrl: reviewUrlOf(ctx.project),
      reviewLinkProblem: reviewLinkProblem(ctx.project),
      canSend,
      planMessage: canSend ? null : REVIEW_PLAN_MESSAGE,
      // null on plans with no monthly cap
      allowance,
      requests,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load review requests";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;

  // Review requests leave from Conduikt's shared mailbox, so a free
  // signup gets a small monthly allowance and then an upgrade prompt.
  const plan = await planOfUser(ctx.supabase, ctx.userId);
  const allowance = await reviewAllowance(ctx.supabase, ctx.userId, plan);
  if (allowance && allowance.remaining <= 0) {
    return NextResponse.json({ error: REVIEW_PLAN_MESSAGE, code: "upgrade_required", allowance }, { status: 402 });
  }

  const window = { limit: REVIEW_REQUESTS_PER_HOUR, windowSeconds: REVIEW_WINDOW_SECONDS };
  const calls = await rateLimit(`review-requests:${ctx.userId}`, window);
  if (!calls.allowed) return rateLimitResponse(calls);

  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid request" }, { status: 400 });
  }

  const linkProblem = reviewLinkProblem(ctx.project);
  if (linkProblem) {
    return NextResponse.json({ error: linkProblem }, { status: 400 });
  }

  const project = { id: ctx.project.id, name: ctx.project.name, review_url: ctx.project.review_url };
  const rowsWindow = { limit: REVIEW_ROWS_PER_HOUR, windowSeconds: REVIEW_WINDOW_SECONDS };

  // Many at once.
  if ("csv" in parsed.data) {
    const { rows, skippedLines } = parseReviewCsv(parsed.data.csv);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No usable lines. Each line needs a name and an email or phone number." },
        { status: 400 }
      );
    }
    if (rows.length > CSV_MAX_ROWS) {
      return NextResponse.json(
        {
          error: `That paste has ${rows.length} customers; the most one paste can send is ${CSV_MAX_ROWS}. Split it into smaller pastes.`,
          code: "too_many_rows",
          max: CSV_MAX_ROWS,
        },
        { status: 400 }
      );
    }
    if (allowance && rows.length > allowance.remaining) {
      return NextResponse.json(
        { error: reviewAllowanceMessage(allowance, rows.length), code: "upgrade_required", allowance },
        { status: 402 }
      );
    }
    // The cap that matters is customers contacted, not calls made.
    const slots = await takeRateLimit(`review-rows:${ctx.userId}`, rowsWindow, rows.length);
    if (!slots.allowed) return rateLimitResponse(slots);

    try {
      const results = await sendReviewRequests(ctx.supabase, project, rows);
      return NextResponse.json({ ...tally(results), requests: results, skippedLines }, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send the review requests";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // One customer.
  const { name, email, phone, channel, contactId } = parsed.data;
  if (!email && !phone && !contactId) {
    return NextResponse.json({ error: "Add an email address or a phone number" }, { status: 400 });
  }
  const slot = await takeRateLimit(`review-rows:${ctx.userId}`, rowsWindow, 1);
  if (!slot.allowed) return rateLimitResponse(slot);

  try {
    const row = await sendReviewRequest(ctx.supabase, {
      project,
      name,
      email: email ?? null,
      phone: phone ?? null,
      contactId: contactId ?? null,
      requested: channel ?? null,
    });
    return NextResponse.json({ ...tally([row]), request: row }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send the review request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function tally(rows: ReviewRequestRow[]) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of rows) {
    if (r.status === "sent") sent++;
    else if (r.status === "failed") failed++;
    else if (r.status === "skipped") skipped++;
  }
  return { sent, failed, skipped };
}

import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, estimateCostUsd } from "./model-routing";

let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

export type AIModel = "claude-sonnet-4-6" | "claude-opus-4-6" | "claude-haiku-4-5";

export { DEFAULT_MODEL };

export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "refusal" | null;

export interface GenerationResult {
  content: string;
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  stopReason: StopReason;
}

/**
 * Thrown by generateWithClaudeCompletion when the model still hasn't finished
 * after the allowed number of continuation attempts. Carries whatever partial
 * content we accumulated so the caller can decide whether to surface it.
 */
export class TruncatedResponseError extends Error {
  constructor(
    public partialContent: string,
    public outputTokens: number,
    public attempts: number,
  ) {
    super(
      `Claude response was truncated (stop_reason: max_tokens) after ${attempts} attempt(s)`,
    );
    this.name = "TruncatedResponseError";
  }
}

// ---------------------------------------------------------------------------
// The writing service is unavailable
// ---------------------------------------------------------------------------

export type AIUnavailableCode = "no_credit" | "auth" | "rate_limited" | "overloaded" | "network" | "spend_cap";

/** The one sentence every surface shows. Billing and keys are our problem, not the user's. */
export const AI_UNAVAILABLE_MESSAGE =
  "We couldn't reach the writing service. Nothing was charged. Try again in a few minutes.";

// Whether trying again right now could succeed. No credit, a bad key and
// our own spend cap won't clear themselves in the next minute.
const RETRYABLE: Record<AIUnavailableCode, boolean> = {
  no_credit: false,
  auth: false,
  spend_cap: false,
  rate_limited: true,
  overloaded: true,
  network: true,
};

/**
 * Thrown by generateWithClaude (and the spend cap) when the model cannot be
 * called at all, as opposed to answering badly. `code` says why, for the
 * server log; `userMessage` is the only text that reaches a user.
 */
export class AIUnavailableError extends Error {
  readonly code: AIUnavailableCode;
  readonly retryable: boolean;
  readonly userMessage: string;

  constructor(code: AIUnavailableCode, detail?: string) {
    super(`AI unavailable (${code})${detail ? `: ${detail}` : ""}`);
    this.name = "AIUnavailableError";
    this.code = code;
    this.retryable = RETRYABLE[code];
    this.userMessage = AI_UNAVAILABLE_MESSAGE;
  }
}

/** The JSON body an API route returns (with status 503) for an AIUnavailableError. */
export function aiUnavailableBody(err: AIUnavailableError) {
  return { error: err.userMessage, code: "ai_unavailable" as const, reason: err.code, retryable: true as const };
}

function errorText(err: unknown): string {
  if (!err || typeof err !== "object") return String(err ?? "");
  const e = err as { message?: unknown; error?: unknown };
  const parts = [typeof e.message === "string" ? e.message : ""];
  try {
    if (e.error && typeof e.error === "object") parts.push(JSON.stringify(e.error));
  } catch {
    // unserialisable body: the message is enough
  }
  return parts.join(" ").toLowerCase();
}

function apiErrorType(err: unknown): string | null {
  const body = (err as { error?: { error?: { type?: unknown }; type?: unknown } } | null)?.error;
  const t = body?.error?.type ?? body?.type;
  return typeof t === "string" ? t : null;
}

/**
 * Turn an Anthropic SDK error into an AIUnavailableError, or null when the
 * error is something else (a bug, a bad prompt) that should surface as is.
 * Matches on status and body rather than SDK classes so it holds across
 * SDK versions and works on plain objects in tests.
 */
export function mapAnthropicError(err: unknown): AIUnavailableError | null {
  if (err instanceof AIUnavailableError) return err;
  if (!err || typeof err !== "object") return null;
  const e = err as { status?: unknown; name?: unknown; code?: unknown; cause?: { code?: unknown } };
  const status = typeof e.status === "number" ? e.status : null;
  const text = errorText(err);
  const type = apiErrorType(err);
  const name = typeof e.name === "string" ? e.name : "";

  if (status === 400 && (text.includes("credit balance") || type === "billing_error")) {
    return new AIUnavailableError("no_credit", text.slice(0, 200));
  }
  if (status === 401 || status === 403 || type === "authentication_error" || type === "permission_error") {
    return new AIUnavailableError("auth", text.slice(0, 200));
  }
  if (status === 429 || type === "rate_limit_error") {
    return new AIUnavailableError("rate_limited", text.slice(0, 200));
  }
  if (status === 529 || type === "overloaded_error" || text.includes("overloaded")) {
    return new AIUnavailableError("overloaded", text.slice(0, 200));
  }
  if (status !== null && status >= 500) {
    return new AIUnavailableError("overloaded", text.slice(0, 200));
  }
  const netCode = typeof e.code === "string" ? e.code : typeof e.cause?.code === "string" ? e.cause.code : "";
  if (
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    name === "AbortError" ||
    name === "TimeoutError" ||
    /^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR)/.test(netCode) ||
    (status === null && /connection error|request timed out|fetch failed|socket hang up/.test(text))
  ) {
    return new AIUnavailableError("network", text.slice(0, 200));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Daily spend cap
// ---------------------------------------------------------------------------

export const SPEND_CAP_CONFIG_KEY = "ai_daily_cap_usd";
export const SPEND_CAP_DEFAULT_USD = 25;
const SPEND_CAP_CACHE_MS = 60_000;

type Row = Record<string, unknown>;
/** The slice of a Supabase client the cap needs; a mock in tests. */
export interface SpendCapDb {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): { maybeSingle(): PromiseLike<{ data: Row | null }> };
      gte(column: string, value: unknown): PromiseLike<{ data: Row[] | null }>;
    };
  };
}

export interface SpendCapDeps {
  db?: SpendCapDb;
  now?: () => Date;
  sendAlert?: (spentUsd: number, capUsd: number, day: string) => Promise<void>;
}

export interface SpendCapVerdict {
  capUsd: number;
  spentUsd: number;
  exceeded: boolean;
  day: string;
}

let capCache: { at: number; verdict: SpendCapVerdict } | null = null;
let alertedDay: string | null = null;

/** Tests only: forget the cached verdict and the "alert sent today" marker. */
export function resetSpendCapCache() {
  capCache = null;
  alertedDay = null;
}

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function defaultDb(): Promise<SpendCapDb | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createServiceClient } = await import("@/src/lib/supabase/service");
  return createServiceClient() as unknown as SpendCapDb;
}

async function defaultAlert(spentUsd: number, capUsd: number, day: string): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) return;
  const { Resend } = await import("resend");
  await new Resend(key).emails.send({
    from: "Conduikt Alerts <hello@contacts.conduikt.com>",
    to,
    subject: `AI spend cap reached: $${spentUsd.toFixed(2)} of $${capUsd.toFixed(2)} on ${day}`,
    text:
      `Conduikt has stopped calling the model for the rest of ${day} (UTC).\n\n` +
      `Estimated spend today: $${spentUsd.toFixed(2)}\nDaily cap: $${capUsd.toFixed(2)}\n\n` +
      `Users see "${AI_UNAVAILABLE_MESSAGE}" until midnight UTC, or until the cap is raised ` +
      `(app_config key ${SPEND_CAP_CONFIG_KEY}).\n\n` +
      `The figure is estimated from tokens in ai_generations at list prices.`,
  });
}

function readCap(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : SPEND_CAP_DEFAULT_USD;
}

/**
 * Today's estimated model spend against the cap in app_config
 * (`ai_daily_cap_usd`, default $25). The verdict is cached in-process for a
 * minute so a burst of calls costs one query. Over the cap: one admin email
 * per UTC day, then AIUnavailableError("spend_cap") for every call until
 * midnight. Fails open when the database can't be reached: a cap that
 * blocks the product on a transient outage is worse than a day over budget.
 */
export async function checkSpendCap(deps: SpendCapDeps = {}): Promise<SpendCapVerdict> {
  const now = deps.now ?? (() => new Date());
  const t = now();
  if (capCache && t.getTime() - capCache.at < SPEND_CAP_CACHE_MS && capCache.verdict.day === utcDay(t)) {
    if (capCache.verdict.exceeded) throw new AIUnavailableError("spend_cap", describe(capCache.verdict));
    return capCache.verdict;
  }

  const db = deps.db ?? (await defaultDb());
  const day = utcDay(t);
  let verdict: SpendCapVerdict = { capUsd: SPEND_CAP_DEFAULT_USD, spentUsd: 0, exceeded: false, day };
  if (!db) return verdict;

  try {
    const dayStart = `${day}T00:00:00.000Z`;
    const [{ data: cfg }, { data: rows }] = await Promise.all([
      db.from("app_config").select("value").eq("key", SPEND_CAP_CONFIG_KEY).maybeSingle(),
      db.from("ai_generations").select("model, input_tokens, output_tokens").gte("created_at", dayStart),
    ]);
    const capUsd = readCap(cfg?.value);
    const spentUsd = (rows ?? []).reduce(
      (sum, r) => sum + estimateCostUsd(r.model as string, Number(r.input_tokens ?? 0), Number(r.output_tokens ?? 0)),
      0,
    );
    verdict = { capUsd, spentUsd, exceeded: capUsd > 0 && spentUsd >= capUsd, day };
  } catch (err) {
    console.error("[ai-client] spend cap check failed, allowing the call:", err);
    return verdict;
  }

  capCache = { at: t.getTime(), verdict };
  if (!verdict.exceeded) return verdict;

  if (alertedDay !== day) {
    alertedDay = day;
    console.error(`[ai-client] unavailable: spend_cap. ${describe(verdict)}`);
    await (deps.sendAlert ?? defaultAlert)(verdict.spentUsd, verdict.capUsd, day).catch((err) =>
      console.error("[ai-client] spend cap alert failed:", err),
    );
  }
  throw new AIUnavailableError("spend_cap", describe(verdict));
}

function describe(v: SpendCapVerdict) {
  return `$${v.spentUsd.toFixed(2)} of $${v.capUsd.toFixed(2)} spent on ${v.day}`;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const STREAM_ABOVE_TOKENS = 16_000;

type Turn = { role: "user" | "assistant"; content: string };

// Current models reject assistant-message prefill ("The conversation must
// end with a user message"), so a cut-off answer is continued with a
// normal turn: the partial answer as the assistant's message, then a user
// message asking for the rest.
export const CONTINUE_PROMPT =
  "Your previous reply was cut off by the length limit. Continue it from exactly where it stopped. " +
  "Output only the continuation: do not repeat anything already written, do not add a preface, and do not start over.";

export function continuationMessages(userPrompt: string, soFar: string): Turn[] {
  if (!soFar) return [{ role: "user", content: userPrompt }];
  return [
    { role: "user", content: userPrompt },
    { role: "assistant", content: soFar.trimEnd() },
    { role: "user", content: CONTINUE_PROMPT },
  ];
}

/** Append a continuation, dropping any text the model repeated at the seam. */
export function joinContinuation(soFar: string, next: string): string {
  const base = soFar.trimEnd();
  const max = Math.min(300, base.length, next.length);
  for (let k = max; k >= 12; k--) {
    if (base.endsWith(next.slice(0, k))) return base + next.slice(k);
  }
  return base + next;
}

export async function generateWithClaude({
  systemPrompt,
  userPrompt,
  model = DEFAULT_MODEL,
  maxTokens = 4000,
  temperature,
  prefill,
}: {
  systemPrompt: string;
  userPrompt: string;
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
  prefill?: string;
}): Promise<GenerationResult> {
  await checkSpendCap();

  const anthropic = getAnthropicClient();
  const start = Date.now();

  // `prefill` is the cut-off answer so far; see continuationMessages.
  const messages = continuationMessages(userPrompt, prefill ?? "");

  const params = {
    model,
    max_tokens: maxTokens,
    temperature: temperature ?? 1,
    system: systemPrompt,
    messages,
  };
  // The SDK refuses non-streaming requests that could run past 10 minutes
  // (large max_tokens, e.g. the 24k-token Growth Plan). Stream those and
  // wait for the final message — same result shape, no timeout.
  let response;
  try {
    response =
      maxTokens > STREAM_ABOVE_TOKENS
        ? await anthropic.messages.stream(params).finalMessage()
        : await anthropic.messages.create(params);
  } catch (err) {
    const unavailable = mapAnthropicError(err);
    if (unavailable) {
      // The real reason stays in the log; users only see userMessage.
      console.error(`[ai-client] unavailable: ${unavailable.code}.`, err instanceof Error ? err.message : err);
      throw unavailable;
    }
    throw err;
  }

  const durationMs = Date.now() - start;
  const textBlock = response.content.find((b) => b.type === "text");

  return {
    content: textBlock?.text ?? "",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
    stopReason: response.stop_reason as StopReason,
  };
}

/**
 * Like generateWithClaude but keeps going until Claude actually finishes.
 *
 * If the first call hits max_tokens, we send what Claude already wrote back
 * and ask for the rest (continuationMessages), then stitch the pieces
 * together, trimming any overlap at the seam. Up to maxContinuations extra attempts. After
 * that we throw TruncatedResponseError with the accumulated partial content.
 */
export async function generateWithClaudeCompletion(opts: {
  systemPrompt: string;
  userPrompt: string;
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
  maxContinuations?: number;
}): Promise<GenerationResult> {
  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_MODEL,
    maxTokens = 4000,
    temperature,
    maxContinuations = 2,
  } = opts;

  let accumulated = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalDuration = 0;
  let lastStopReason: StopReason = null;

  for (let attempt = 0; attempt <= maxContinuations; attempt++) {
    const chunk = await generateWithClaude({
      systemPrompt,
      userPrompt,
      model,
      maxTokens,
      temperature,
      prefill: accumulated || undefined,
    });

    accumulated = accumulated ? joinContinuation(accumulated, chunk.content) : chunk.content;
    totalInputTokens += chunk.inputTokens;
    totalOutputTokens += chunk.outputTokens;
    totalDuration += chunk.durationMs;
    lastStopReason = chunk.stopReason;

    if (chunk.stopReason !== "max_tokens") {
      return {
        content: accumulated,
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: totalDuration,
        stopReason: lastStopReason,
      };
    }

    if (process.env.NODE_ENV !== "test") {
      console.warn(
        `[ai-client] Truncation detected on attempt ${attempt + 1}. Continuing from ${accumulated.length} chars, ${totalOutputTokens} output tokens so far.`,
      );
    }
  }

  throw new TruncatedResponseError(
    accumulated,
    totalOutputTokens,
    maxContinuations + 1,
  );
}

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

export type AIModel = "claude-sonnet-4-6" | "claude-opus-4-6";

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
  model = "claude-sonnet-4-6",
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
  const response =
    maxTokens > STREAM_ABOVE_TOKENS
      ? await anthropic.messages.stream(params).finalMessage()
      : await anthropic.messages.create(params);

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
    model = "claude-sonnet-4-6",
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

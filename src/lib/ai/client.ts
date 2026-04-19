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

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: userPrompt },
  ];
  if (prefill) {
    messages.push({ role: "assistant", content: prefill });
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: temperature ?? 1,
    system: systemPrompt,
    messages,
  });

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
 * If the first call hits max_tokens, we prefill a second call with everything
 * Claude already wrote. Claude resumes from the exact character it stopped at,
 * so no tokens are regenerated. Up to maxContinuations extra attempts. After
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

    accumulated += chunk.content;
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

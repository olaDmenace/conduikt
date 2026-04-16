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

export interface GenerationResult {
  content: string;
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export async function generateWithClaude({
  systemPrompt,
  userPrompt,
  model = "claude-sonnet-4-6",
  maxTokens = 4000,
  temperature,
}: {
  systemPrompt: string;
  userPrompt: string;
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
}): Promise<GenerationResult> {
  const anthropic = getAnthropicClient();
  const start = Date.now();

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: temperature ?? 1,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const durationMs = Date.now() - start;
  const textBlock = response.content.find((b) => b.type === "text");

  return {
    content: textBlock?.text ?? "",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
  };
}

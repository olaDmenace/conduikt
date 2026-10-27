// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Maps SDK failures to the one typed error every route and runner understands.

const sdk = vi.hoisted(() => ({ create: vi.fn(), stream: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: sdk.create, stream: sdk.stream };
  },
}));

import {
  AI_UNAVAILABLE_MESSAGE,
  AIUnavailableError,
  aiUnavailableBody,
  generateWithClaude,
  mapAnthropicError,
  resetSpendCapCache,
  TruncatedResponseError,
} from "@/src/lib/ai/client";

// Shaped like the SDK's APIError: status, message and the parsed body.
function apiError(status: number, message: string, type?: string) {
  const err = new Error(`${status} ${message}`) as Error & { status: number; error: unknown };
  err.name = "APIError";
  err.status = status;
  err.error = type ? { type: "error", error: { type, message } } : undefined;
  return err;
}

describe("mapAnthropicError", () => {
  it("maps a 400 about the credit balance to no_credit", () => {
    const err = apiError(
      400,
      'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
      "invalid_request_error",
    );
    const mapped = mapAnthropicError(err);
    expect(mapped).toBeInstanceOf(AIUnavailableError);
    expect(mapped?.code).toBe("no_credit");
    expect(mapped?.retryable).toBe(false);
  });

  it("maps 401 and 403 to auth", () => {
    expect(mapAnthropicError(apiError(401, "invalid x-api-key", "authentication_error"))?.code).toBe("auth");
    expect(mapAnthropicError(apiError(403, "forbidden", "permission_error"))?.code).toBe("auth");
  });

  it("maps 429 to rate_limited", () => {
    const mapped = mapAnthropicError(apiError(429, "rate limit", "rate_limit_error"));
    expect(mapped?.code).toBe("rate_limited");
    expect(mapped?.retryable).toBe(true);
  });

  it("maps 529 and overloaded_error to overloaded", () => {
    expect(mapAnthropicError(apiError(529, "Overloaded", "overloaded_error"))?.code).toBe("overloaded");
    expect(mapAnthropicError(apiError(500, "Overloaded", "overloaded_error"))?.code).toBe("overloaded");
  });

  it("maps connection failures and timeouts to network", () => {
    const conn = new Error("Connection error.");
    conn.name = "APIConnectionError";
    expect(mapAnthropicError(conn)?.code).toBe("network");

    const timeout = new Error("Request timed out.");
    timeout.name = "APIConnectionTimeoutError";
    expect(mapAnthropicError(timeout)?.code).toBe("network");

    const reset = new Error("fetch failed") as Error & { cause: { code: string } };
    reset.cause = { code: "ECONNRESET" };
    expect(mapAnthropicError(reset)?.code).toBe("network");
  });

  it("leaves other errors alone", () => {
    expect(mapAnthropicError(apiError(400, "messages: text content blocks must be non-empty", "invalid_request_error"))).toBeNull();
    expect(mapAnthropicError(new Error("boom"))).toBeNull();
    expect(mapAnthropicError(new TruncatedResponseError("partial", 10, 3))).toBeNull();
    expect(mapAnthropicError(null)).toBeNull();
  });

  it("passes an AIUnavailableError through unchanged", () => {
    const err = new AIUnavailableError("spend_cap");
    expect(mapAnthropicError(err)).toBe(err);
  });

  it("never puts billing or keys in the user message", () => {
    for (const code of ["no_credit", "auth", "rate_limited", "overloaded", "network", "spend_cap"] as const) {
      const err = new AIUnavailableError(code, "Your credit balance is too low");
      expect(err.userMessage).toBe(AI_UNAVAILABLE_MESSAGE);
      expect(err.userMessage).not.toMatch(/credit|billing|key/i);
      expect(err.message).toContain(code);
    }
  });

  it("builds the 503 body routes return", () => {
    expect(aiUnavailableBody(new AIUnavailableError("no_credit"))).toEqual({
      error: AI_UNAVAILABLE_MESSAGE,
      code: "ai_unavailable",
      reason: "no_credit",
      retryable: true,
    });
  });
});

describe("generateWithClaude", () => {
  const env = { ...process.env };
  beforeEach(() => {
    resetSpendCapCache();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
    sdk.create.mockReset();
  });
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("throws AIUnavailableError(no_credit) and logs the real reason", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.create.mockRejectedValue(
      apiError(400, "Your credit balance is too low to access the Anthropic API.", "invalid_request_error"),
    );
    await expect(generateWithClaude({ systemPrompt: "s", userPrompt: "u" })).rejects.toMatchObject({
      name: "AIUnavailableError",
      code: "no_credit",
      userMessage: AI_UNAVAILABLE_MESSAGE,
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("no_credit"), expect.stringContaining("credit balance"));
  });

  it("rethrows errors that are not about availability", async () => {
    sdk.create.mockRejectedValue(new Error("bad prompt"));
    await expect(generateWithClaude({ systemPrompt: "s", userPrompt: "u" })).rejects.toThrow("bad prompt");
  });

  it("returns the usual result when the call works", async () => {
    sdk.create.mockResolvedValue({
      content: [{ type: "text", text: "hello" }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: "end_turn",
    });
    const out = await generateWithClaude({ systemPrompt: "s", userPrompt: "u" });
    expect(out.content).toBe("hello");
    expect(out.model).toBe("claude-sonnet-4-6");
    expect(out.stopReason).toBe("end_turn");
  });
});

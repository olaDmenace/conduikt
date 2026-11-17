// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));

import {
  availableEngines,
  ClaudeEngine,
  CLAUDE_WEB_SEARCH_TOOL,
  parseClaudeAnswer,
  type ClaudeClientLike,
} from "@/src/lib/integrations/ai-visibility";
import { AIUnavailableError } from "@/src/lib/ai/client";

// The shape the Messages API returns for a web-search turn: a server tool
// use, its result (a list on success, one error object on failure) and
// the text blocks that follow.
const SUCCESS_RESPONSE = {
  id: "msg_1",
  stop_reason: "end_turn",
  content: [
    { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "best dentist lekki" } },
    {
      type: "web_search_tool_result",
      tool_use_id: "srvtoolu_1",
      content: [
        { type: "web_search_result", url: "https://brightsmiles.ng/", title: "Bright Smiles", encrypted_content: "x" },
        { type: "web_search_result", url: "https://www.google.com/maps/place/Bright+Smiles", title: "Maps", encrypted_content: "y" },
        { type: "web_search_result", url: "https://brightsmiles.ng/", title: "dup", encrypted_content: "z" },
      ],
    },
    { type: "text", text: "For teeth whitening in Lekki, " },
    { type: "text", text: "people recommend Bright Smiles Dental (brightsmiles.ng)." },
  ],
};

const ERROR_RESPONSE = {
  id: "msg_2",
  stop_reason: "end_turn",
  content: [
    { type: "server_tool_use", id: "srvtoolu_2", name: "web_search", input: { query: "x" } },
    {
      type: "web_search_tool_result",
      tool_use_id: "srvtoolu_2",
      content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" },
    },
    { type: "text", text: "I could not search, but Bright Smiles is well known." },
  ],
};

describe("parseClaudeAnswer", () => {
  it("joins text blocks and collects cited urls from web_search_tool_result, without duplicates", () => {
    const a = parseClaudeAnswer(SUCCESS_RESPONSE);
    expect(a.text).toBe("For teeth whitening in Lekki, people recommend Bright Smiles Dental (brightsmiles.ng).");
    expect(a.citations).toEqual(["https://brightsmiles.ng/", "https://www.google.com/maps/place/Bright+Smiles"]);
  });

  it("treats an error object as no citations and keeps the text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = parseClaudeAnswer(ERROR_RESPONSE);
    expect(a.citations).toEqual([]);
    expect(a.text).toContain("Bright Smiles");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("web search error"), "max_uses_exceeded");
    warn.mockRestore();
  });

  it("ignores thinking blocks and unknown block types", () => {
    const a = parseClaudeAnswer({
      content: [
        { type: "thinking", text: "" },
        { type: "text", text: "Hello" },
        { type: "something_else", content: [{ type: "web_search_result", url: "https://nope.com" }] },
      ],
    });
    expect(a).toMatchObject({ text: "Hello", citations: [] });
  });
});

describe("ClaudeEngine", () => {
  afterEach(() => vi.restoreAllMocks());

  function fakeClient(response: unknown): ClaudeClientLike & { create: ReturnType<typeof vi.fn> } {
    const create = vi.fn(async () => response);
    return { messages: { create }, create };
  }

  it("sends the web search tool at the cheap model with low effort and parses the answer", async () => {
    const client = fakeClient(SUCCESS_RESPONSE);
    const engine = new ClaudeEngine({ client, spendCap: async () => undefined });
    expect(engine.name).toBe("claude");
    expect(engine.available).toBe(true);

    const a = await engine.ask("Best teeth whitening near Lekki");
    expect(a.citations).toContain("https://brightsmiles.ng/");

    const params = client.create.mock.calls[0][0] as Record<string, unknown>;
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.max_tokens).toBe(2048);
    expect(params.output_config).toEqual({ effort: "low" });
    expect(params.tools).toEqual([CLAUDE_WEB_SEARCH_TOOL]);
    expect(CLAUDE_WEB_SEARCH_TOOL).toEqual({ type: "web_search_20260209", name: "web_search", max_uses: 3 });
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("thinking");
    expect(params.messages).toEqual([{ role: "user", content: "Best teeth whitening near Lekki" }]);
  });

  it("returns an empty answer when the model declines", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = fakeClient({ stop_reason: "refusal", stop_details: { category: "general_harms" }, content: [] });
    const engine = new ClaudeEngine({ client, spendCap: async () => undefined });
    expect(await engine.ask("q")).toMatchObject({ text: "", citations: [] });
    warn.mockRestore();
  });

  it("maps SDK errors to AIUnavailableError so the caller can tell retryable from broken", async () => {
    const client: ClaudeClientLike = {
      messages: {
        create: async () => {
          throw Object.assign(new Error("overloaded"), { status: 529 });
        },
      },
    };
    const engine = new ClaudeEngine({ client, spendCap: async () => undefined });
    await expect(engine.ask("q")).rejects.toBeInstanceOf(AIUnavailableError);
  });

  it("stops before calling the model when the spend cap throws", async () => {
    const client = fakeClient(SUCCESS_RESPONSE);
    const engine = new ClaudeEngine({
      client,
      spendCap: async () => {
        throw new AIUnavailableError("spend_cap");
      },
    });
    await expect(engine.ask("q")).rejects.toBeInstanceOf(AIUnavailableError);
    expect(client.create).not.toHaveBeenCalled();
  });

  it("is unavailable without a key or a client", () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(new ClaudeEngine().available).toBe(false);
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

describe("availableEngines", () => {
  it("includes claude whenever ANTHROPIC_API_KEY is set, first", () => {
    expect(availableEngines({ ANTHROPIC_API_KEY: "k" } as unknown as NodeJS.ProcessEnv).map((e) => e.name)).toEqual(["claude"]);
    expect(
      availableEngines({ ANTHROPIC_API_KEY: "k", PERPLEXITY_API_KEY: "p" } as unknown as NodeJS.ProcessEnv).map((e) => e.name)
    ).toEqual(["claude", "perplexity"]);
    expect(availableEngines({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});

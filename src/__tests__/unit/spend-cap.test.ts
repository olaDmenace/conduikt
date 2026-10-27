// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({ default: class {} }));

import {
  AIUnavailableError,
  checkSpendCap,
  resetSpendCapCache,
  SPEND_CAP_CONFIG_KEY,
  SPEND_CAP_DEFAULT_USD,
  type SpendCapDb,
} from "@/src/lib/ai/client";

interface Gen {
  model: string;
  input_tokens: number;
  output_tokens: number;
}

// The two queries the cap runs, on a fake service client, with call counts.
function fakeDb(opts: { cap?: unknown; rows?: Gen[]; fail?: boolean } = {}) {
  const calls = { config: 0, generations: 0, since: "" };
  const db: SpendCapDb = {
    from(table) {
      return {
        select() {
          return {
            eq(_column, key) {
              return {
                async maybeSingle() {
                  calls.config++;
                  if (opts.fail) throw new Error("db down");
                  if (table !== "app_config" || key !== SPEND_CAP_CONFIG_KEY) return { data: null };
                  return { data: opts.cap === undefined ? null : { value: opts.cap } };
                },
              };
            },
            async gte(_column, value) {
              calls.generations++;
              calls.since = String(value);
              if (opts.fail) throw new Error("db down");
              return { data: (opts.rows ?? []) as unknown as Record<string, unknown>[] };
            },
          };
        },
      };
    },
  };
  return { db, calls };
}

const sonnet = (inTok: number, outTok: number): Gen => ({ model: "claude-sonnet-4-6", input_tokens: inTok, output_tokens: outTok });
const at = (iso: string) => () => new Date(iso);

describe("checkSpendCap", () => {
  beforeEach(() => {
    resetSpendCapCache();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses the default cap when app_config has none", async () => {
    const { db } = fakeDb();
    const v = await checkSpendCap({ db, now: at("2026-10-26T10:00:00Z") });
    expect(v).toEqual({ capUsd: SPEND_CAP_DEFAULT_USD, spentUsd: 0, exceeded: false, day: "2026-10-26" });
  });

  it("sums today's spend from tokens at list prices", async () => {
    // 1M sonnet input ($3) + 200k sonnet output ($3) = $6
    const { db, calls } = fakeDb({ cap: 25, rows: [sonnet(1_000_000, 0), sonnet(0, 200_000)] });
    const v = await checkSpendCap({ db, now: at("2026-10-26T10:00:00Z") });
    expect(v.spentUsd).toBeCloseTo(6, 6);
    expect(v.capUsd).toBe(25);
    expect(v.exceeded).toBe(false);
    expect(calls.since).toBe("2026-10-26T00:00:00.000Z");
  });

  it("reads a cap stored as a string", async () => {
    const { db } = fakeDb({ cap: "40" });
    expect((await checkSpendCap({ db, now: at("2026-10-26T10:00:00Z") })).capUsd).toBe(40);
  });

  it("throws spend_cap once the cap is reached and alerts the admin once a day", async () => {
    const sendAlert = vi.fn().mockResolvedValue(undefined);
    // 10M sonnet input = $30 against a $25 cap
    const { db, calls } = fakeDb({ cap: 25, rows: [sonnet(10_000_000, 0)] });

    const first = checkSpendCap({ db, now: at("2026-10-26T10:00:00Z"), sendAlert });
    await expect(first).rejects.toBeInstanceOf(AIUnavailableError);
    await expect(first).rejects.toMatchObject({ code: "spend_cap", retryable: false });
    expect(sendAlert).toHaveBeenCalledTimes(1);
    expect(sendAlert).toHaveBeenCalledWith(30, 25, "2026-10-26");

    // Still over, later the same day and past the cache: no second email.
    await expect(checkSpendCap({ db, now: at("2026-10-26T12:00:00Z"), sendAlert })).rejects.toMatchObject({ code: "spend_cap" });
    expect(calls.generations).toBe(2);
    expect(sendAlert).toHaveBeenCalledTimes(1);

    // A new day gets a fresh verdict and, if still over, a fresh alert.
    await expect(checkSpendCap({ db, now: at("2026-10-27T00:05:00Z"), sendAlert })).rejects.toMatchObject({ code: "spend_cap" });
    expect(sendAlert).toHaveBeenCalledTimes(2);
  });

  it("caches the verdict for a minute", async () => {
    const { db, calls } = fakeDb({ cap: 25, rows: [sonnet(1_000_000, 0)] });
    await checkSpendCap({ db, now: at("2026-10-26T10:00:00Z") });
    await checkSpendCap({ db, now: at("2026-10-26T10:00:30Z") });
    expect(calls.generations).toBe(1);
    await checkSpendCap({ db, now: at("2026-10-26T10:01:01Z") });
    expect(calls.generations).toBe(2);
  });

  it("serves an exceeded verdict from the cache without another query", async () => {
    const sendAlert = vi.fn().mockResolvedValue(undefined);
    const { db, calls } = fakeDb({ cap: 1, rows: [sonnet(1_000_000, 0)] });
    await expect(checkSpendCap({ db, now: at("2026-10-26T10:00:00Z"), sendAlert })).rejects.toMatchObject({ code: "spend_cap" });
    await expect(checkSpendCap({ db, now: at("2026-10-26T10:00:10Z"), sendAlert })).rejects.toMatchObject({ code: "spend_cap" });
    expect(calls.generations).toBe(1);
    expect(sendAlert).toHaveBeenCalledTimes(1);
  });

  it("a cap of 0 disables the cap", async () => {
    const { db } = fakeDb({ cap: 0, rows: [sonnet(10_000_000, 0)] });
    const v = await checkSpendCap({ db, now: at("2026-10-26T10:00:00Z") });
    expect(v.exceeded).toBe(false);
    expect(v.capUsd).toBe(0);
  });

  it("fails open when the database cannot be read", async () => {
    const { db } = fakeDb({ fail: true });
    const v = await checkSpendCap({ db, now: at("2026-10-26T10:00:00Z") });
    expect(v.exceeded).toBe(false);
  });

  it("still blocks when the alert email fails", async () => {
    const sendAlert = vi.fn().mockRejectedValue(new Error("resend down"));
    const { db } = fakeDb({ cap: 1, rows: [sonnet(1_000_000, 0)] });
    await expect(checkSpendCap({ db, now: at("2026-10-26T10:00:00Z"), sendAlert })).rejects.toMatchObject({ code: "spend_cap" });
  });
});

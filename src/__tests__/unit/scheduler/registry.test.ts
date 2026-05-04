import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerHandler,
  getHandler,
  listRegisteredTypes,
  _resetHandlersForTesting,
} from "@/src/lib/scheduler/registry";

beforeEach(() => {
  _resetHandlersForTesting();
});

describe("scheduler registry", () => {
  it("returns undefined for unknown type", () => {
    expect(getHandler("nope")).toBeUndefined();
  });

  it("registers and retrieves a handler", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    registerHandler("foo", handler);
    expect(getHandler("foo")).toBe(handler);
  });

  it("lists registered types sorted", () => {
    registerHandler("zebra", async () => ({ ok: true }));
    registerHandler("apple", async () => ({ ok: true }));
    registerHandler("mango", async () => ({ ok: true }));
    expect(listRegisteredTypes()).toEqual(["apple", "mango", "zebra"]);
  });

  it("re-registering a type overwrites silently in dev", () => {
    const a = vi.fn().mockResolvedValue({ ok: true });
    const b = vi.fn().mockResolvedValue({ ok: true });
    registerHandler("dup", a);
    registerHandler("dup", b);
    expect(getHandler("dup")).toBe(b);
  });
});

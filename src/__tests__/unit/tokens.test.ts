import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { encryptToken, decryptToken, isEncryptionConfigured } from "@/src/lib/crypto/tokens";

const VALID_KEY = "0".repeat(64); // 32 bytes of zero — fine for tests

describe("token crypto", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("round-trips a token through encrypt then decrypt", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const plain = "ya29.a0AfH6SMBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const cipher = encryptToken(plain);
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher).not.toContain(plain);
    expect(decryptToken(cipher)).toBe(plain);
  });

  it("produces different ciphertext on each call (random IV)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const plain = "the-same-token-twice";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(plain);
    expect(decryptToken(b)).toBe(plain);
  });

  it("returns plaintext unchanged when value has no v1: prefix", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const legacy = "plaintext-token-from-old-row";
    expect(decryptToken(legacy)).toBe(legacy);
  });

  it("returns null/empty values unchanged", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    expect(encryptToken(null)).toBe(null);
    expect(encryptToken("")).toBe("");
    expect(decryptToken(null)).toBe(null);
    expect(decryptToken("")).toBe("");
  });

  it("encrypt without key warns once and falls back to plaintext", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = encryptToken("some-token");
    expect(result).toBe("some-token");
    // Warn fires at least once for the missing key
    expect(warn).toHaveBeenCalled();
  });

  it("decrypt of v1 ciphertext throws when key is missing", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const cipher = encryptToken("payload");
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => decryptToken(cipher)).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("decrypt of malformed v1 ciphertext throws", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    expect(() => decryptToken("v1:onlyonepart")).toThrow(/malformed/);
    expect(() => decryptToken("v1:::")).toThrow(/malformed/);
  });

  it("decrypt of tampered v1 ciphertext throws (auth tag check)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const cipher = encryptToken("payload");
    // Flip a byte in the ciphertext segment
    const parts = cipher.split(":");
    const ct = Buffer.from(parts[3], "base64");
    ct[0] ^= 0xff;
    parts[3] = ct.toString("base64");
    const tampered = parts.join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects malformed key (not 64 hex chars)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "not-hex-and-too-short";
    expect(() => encryptToken("payload")).toThrow(/64 hex chars/);
  });

  it("isEncryptionConfigured reflects env var presence", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
    expect(isEncryptionConfigured()).toBe(true);
  });
});

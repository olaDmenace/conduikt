// AES-256-GCM encryption for OAuth tokens stored in connected_accounts.
//
// Storage format: "v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>"
//
// Forward compatibility: decryptToken treats values without the v1: prefix
// as legacy plaintext and returns them unchanged. Existing rows therefore
// keep working until they get re-encrypted on the next refresh/reconnect.
//
// Key: TOKEN_ENCRYPTION_KEY env var, 64 hex chars (32 bytes). Generate with
//   `openssl rand -hex 32`.
//
// Deploy-safety: if the env var is missing, encryptToken logs a warning and
// returns plaintext rather than throwing — so a deploy without the var won't
// break OAuth callbacks. Set the var to actually enable encryption.

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const VERSION = "v1";
const VERSION_PREFIX = `${VERSION}:`;

let warnedMissingKey = false;

function loadKey(): Buffer | null {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Regenerate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.TOKEN_ENCRYPTION_KEY;
}

export function encryptToken<T extends string | null | undefined>(plaintext: T): T {
  if (!plaintext) return plaintext;

  const key = loadKey();
  if (!key) {
    if (!warnedMissingKey) {
      console.warn(
        "[tokens] TOKEN_ENCRYPTION_KEY not set — OAuth tokens will be stored in plaintext. Set this env var to activate encryption."
      );
      warnedMissingKey = true;
    }
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":") as T;
}

export function decryptToken<T extends string | null | undefined>(value: T): T {
  if (!value) return value;

  // Legacy plaintext — no v1 prefix, treat as-is.
  if (!value.startsWith(VERSION_PREFIX)) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 4) {
    throw new Error("decryptToken: malformed v1 ciphertext (wrong segment count)");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("decryptToken: malformed v1 ciphertext (empty segment)");
  }

  const key = loadKey();
  if (!key) {
    throw new Error(
      "decryptToken: TOKEN_ENCRYPTION_KEY is not set but the stored token is encrypted (v1)."
    );
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8") as T;
}

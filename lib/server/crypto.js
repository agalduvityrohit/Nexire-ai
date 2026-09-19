// AES-256-GCM encryption for API keys at rest.
//
// Keys are encrypted in the application before they ever reach the database, so
// the stored value is useless without APP_ENCRYPTION_KEY. Plaintext is never
// written to Supabase and never returned to the browser.

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function loadKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}). It should be base64 of 32 random bytes.`
    );
  }
  return key;
}

/** Returns "v1.<iv>.<authTag>.<ciphertext>", all base64. */
export function encryptSecret(plaintext) {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(payload) {
  if (!payload) return null;
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored secret is malformed or was written by a different scheme.");
  }
  const key = loadKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Last four characters, for the "•••• connected" display. Never the whole key. */
export function lastFour(secret) {
  if (!secret || secret.length < 4) return "••••";
  return secret.slice(-4);
}

export function encryptionConfigured() {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

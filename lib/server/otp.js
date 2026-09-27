// Six-digit email codes for passwordless sign-up/sign-in.
//
// The code is hashed (HMAC-SHA256, keyed with APP_ENCRYPTION_KEY) before it's
// stored, so a leaked database row is useless without the app's own key — same
// principle as lib/server/crypto.js for provider keys. Codes expire in 10
// minutes and are single-use (deleted on success), and a wrong guess is capped
// at 5 tries so a code can't be brute-forced (000000–999999 is only a million
// possibilities).

import crypto from "node:crypto";
import { serviceClient } from "@/lib/server/supabase";

const TABLE = "email_otps";
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(email, code) {
  const key = process.env.APP_ENCRYPTION_KEY || "";
  return crypto.createHmac("sha256", key).update(`${email}:${code}`).digest("hex");
}

export function generateCode() {
  // crypto.randomInt is uniform (no modulo bias), unlike Math.random().
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function storeCode(email, code) {
  const row = { email, code_hash: hashCode(email, code), attempts: 0, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + TTL_MS).toISOString() };
  const { error } = await serviceClient().from(TABLE).upsert(row);
  if (error) throw new Error(`Couldn't store the code: ${error.message}`);
}

/** @returns {{ ok: true } | { ok: false, reason: "no_code" | "expired" | "too_many_attempts" | "wrong_code" }} */
export async function verifyCode(email, code) {
  const db = serviceClient();
  const { data: row } = await db.from(TABLE).select("*").eq("email", email).maybeSingle();
  if (!row) return { ok: false, reason: "no_code" };
  if (new Date(row.expires_at) < new Date()) {
    await db.from(TABLE).delete().eq("email", email);
    return { ok: false, reason: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await db.from(TABLE).delete().eq("email", email);
    return { ok: false, reason: "too_many_attempts" };
  }

  const given = Buffer.from(hashCode(email, code), "hex");
  const expected = Buffer.from(row.code_hash, "hex");
  const match = given.length === expected.length && crypto.timingSafeEqual(given, expected);

  if (!match) {
    await db.from(TABLE).update({ attempts: row.attempts + 1 }).eq("email", email);
    return { ok: false, reason: "wrong_code" };
  }

  await db.from(TABLE).delete().eq("email", email); // single-use
  return { ok: true };
}

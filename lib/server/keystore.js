// Per-company credential storage, one row per provider.
//
// Falls back to an in-memory store when Supabase env vars are absent so the UI
// is reviewable before a project is provisioned. `storageMode()` reports which
// one is live so the screen can say so rather than implying persistence.

import { createClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret, lastFour } from "@/lib/server/crypto";
import { ALL_PROVIDER_IDS, LLM_PROVIDERS } from "@/lib/providers";
import { DEMO_COMPANY_ID, PLATFORM_ID } from "@/lib/server/auth";

const KEYS_TABLE = "company_provider_keys";
const SETTINGS_TABLE = "company_settings";

// Hung off globalThis on purpose: each API route is its own bundle, so a plain
// module-level Map is NOT shared between routes — a key saved via one route
// would be invisible to another. Still process-local; configure Supabase for
// anything beyond local review.
const memKeys = (globalThis.__nexireKeys ||= new Map()); // `${companyId}:${provider}` -> row
const memSettings = (globalThis.__nexireSettings ||= new Map()); // companyId -> { active_llm_provider }

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function storageMode() {
  return supabaseConfigured() ? "supabase" : "memory";
}

function client() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function assertProvider(provider) {
  if (!ALL_PROVIDER_IDS.includes(provider)) throw new Error(`Unknown provider "${provider}".`);
}

/* --------------------------------------------------------------- key rows */

async function readAll(companyId) {
  if (!supabaseConfigured()) {
    return [...memKeys.entries()]
      .filter(([k]) => k.startsWith(`${companyId}:`))
      .map(([, row]) => row);
  }
  const { data, error } = await client().from(KEYS_TABLE).select("*").eq("company_id", companyId);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data || [];
}

async function readOne(companyId, provider) {
  if (!supabaseConfigured()) return memKeys.get(`${companyId}:${provider}`) || null;

  const { data, error } = await client()
    .from(KEYS_TABLE)
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data || null;
}

/** Masked status for every provider. Safe to send to the browser. */
export async function getStatus(companyId) {
  const rows = await readAll(companyId);
  const byProvider = Object.fromEntries(rows.map((r) => [r.provider, r]));

  const status = {};
  for (const id of ALL_PROVIDER_IDS) {
    const row = byProvider[id];
    // Platform keys can also come from an environment variable (e.g. set in
    // Vercel) — count that as connected so the admin screen tells the truth.
    const viaEnv =
      companyId === PLATFORM_ID &&
      !row?.key_ciphertext &&
      id !== "gmail" &&
      Boolean(process.env[`${id.toUpperCase()}_API_KEY`] || (id === "github" && process.env.GITHUB_TOKEN));
    status[id] = {
      connected: Boolean(row?.key_ciphertext) || viaEnv,
      source: viaEnv ? "env" : row?.key_ciphertext ? "stored" : null,
      last4: row?.key_last4 || null,
      model: row?.model || LLM_PROVIDERS[id]?.defaultModel || null,
      account: row?.account || null,
      connectedAt: row?.connected_at || null,
    };
  }
  return status;
}

export async function saveKey(companyId, provider, plaintext, { model, account } = {}) {
  assertProvider(provider);

  const row = {
    company_id: companyId,
    provider,
    key_ciphertext: encryptSecret(plaintext),
    key_last4: lastFour(plaintext),
    model: model?.trim() || null,
    account: account?.trim() || null,
    connected_at: new Date().toISOString(),
  };

  if (!supabaseConfigured()) {
    memKeys.set(`${companyId}:${provider}`, row);
  } else {
    const { error } = await client().from(KEYS_TABLE).upsert(row, { onConflict: "company_id,provider" });
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  }

  return getStatus(companyId);
}

/** Updates the model without touching the stored key. */
export async function saveModel(companyId, provider, model) {
  assertProvider(provider);
  const existing = await readOne(companyId, provider);
  if (!existing) throw new Error("Save a key for this provider first.");

  if (!supabaseConfigured()) {
    memKeys.set(`${companyId}:${provider}`, { ...existing, model: model?.trim() || null });
  } else {
    const { error } = await client()
      .from(KEYS_TABLE)
      .update({ model: model?.trim() || null })
      .eq("company_id", companyId)
      .eq("provider", provider);
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  }

  return getStatus(companyId);
}

export async function deleteKey(companyId, provider) {
  assertProvider(provider);

  if (!supabaseConfigured()) {
    memKeys.delete(`${companyId}:${provider}`);
  } else {
    const { error } = await client()
      .from(KEYS_TABLE)
      .delete()
      .eq("company_id", companyId)
      .eq("provider", provider);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  return getStatus(companyId);
}

/**
 * Server-side only. Returns { key, model, account } for outbound calls, or null.
 *
 * Multi-tenant rules:
 *  - Platform credentials (LLMs, GitHub, Vapi, Deepgram, Resend) belong to the
 *    operator. Every signed-in company silently runs on them; the row lives
 *    under PLATFORM_ID and only an admin can edit it.
 *  - Gmail is different: it is a company's OWN inbox. It resolves only from that
 *    company's row — never the platform's, and never an env var, because an
 *    env-level mailbox would be imported into every tenant's dashboard.
 *  - The public demo gets no keys at all (parsing falls back to the heuristic),
 *    so anonymous visitors can't spend the operator's quota.
 */
export async function resolveCredential(companyId, provider) {
  assertProvider(provider);

  if (companyId === DEMO_COMPANY_ID) return null;

  if (provider === "gmail") {
    if (!companyId) return null;
    const row = await readOne(companyId, "gmail");
    if (!row?.key_ciphertext) return null;
    return {
      key: decryptSecret(row.key_ciphertext),
      model: null,
      account: row.account || null,
      source: "stored",
    };
  }

  const row = await readOne(PLATFORM_ID, provider);
  if (row?.key_ciphertext) {
    return {
      key: decryptSecret(row.key_ciphertext),
      model: row.model || LLM_PROVIDERS[provider]?.defaultModel || null,
      account: row.account || null,
      source: "stored",
    };
  }

  const envKey = process.env[`${provider.toUpperCase()}_API_KEY`] || ENV_ALIASES[provider];
  if (envKey) {
    return {
      key: envKey,
      model: process.env[`${provider.toUpperCase()}_MODEL`] || LLM_PROVIDERS[provider]?.defaultModel || null,
      account: null,
      source: "env",
    };
  }

  return null;
}

// Env names that don't follow the PROVIDER_API_KEY convention. (No Gmail alias:
// see resolveCredential — a shared mailbox would leak across companies.)
const ENV_ALIASES = {
  get github() {
    return process.env.GITHUB_TOKEN;
  },
};

/* ------------------------------------------------------- active provider */

export async function getActiveProvider(forCompanyId) {
  // The demo has no keys at all (resolveCredential returns null for it), so which
  // provider is "active" is moot — answer without a database round-trip, so the
  // demo keeps working when Supabase is unreachable.
  if (forCompanyId === DEMO_COMPANY_ID) return process.env.DEFAULT_LLM_PROVIDER || "gemini";

  const companyId = PLATFORM_ID; // one engine for the whole platform; admins choose it
  if (!supabaseConfigured()) {
    return memSettings.get(companyId)?.active_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "gemini";
  }

  const { data, error } = await client()
    .from(SETTINGS_TABLE)
    .select("active_llm_provider")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data?.active_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "gemini";
}

export async function setActiveProvider(companyId, provider) {
  if (!LLM_PROVIDERS[provider]) throw new Error(`"${provider}" is not an LLM provider.`);

  if (!supabaseConfigured()) {
    memSettings.set(companyId, { active_llm_provider: provider });
  } else {
    const { error } = await client()
      .from(SETTINGS_TABLE)
      .upsert({ company_id: companyId, active_llm_provider: provider }, { onConflict: "company_id" });
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  }

  return provider;
}

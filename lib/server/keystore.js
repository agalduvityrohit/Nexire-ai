// Per-company credential storage, one row per provider.
//
// Falls back to an in-memory store when Supabase env vars are absent so the UI
// is reviewable before a project is provisioned. `storageMode()` reports which
// one is live so the screen can say so rather than implying persistence.

import { createClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret, lastFour } from "@/lib/server/crypto";
import { ALL_PROVIDER_IDS, LLM_PROVIDERS } from "@/lib/providers";

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
    status[id] = {
      connected: Boolean(row?.key_ciphertext),
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
 * Falls back to a process-wide env var so single-tenant deployments work
 * without per-company setup.
 */
export async function resolveCredential(companyId, provider) {
  assertProvider(provider);

  if (companyId) {
    const row = await readOne(companyId, provider);
    if (row?.key_ciphertext) {
      return {
        key: decryptSecret(row.key_ciphertext),
        model: row.model || LLM_PROVIDERS[provider]?.defaultModel || null,
        account: row.account || null,
        source: "stored",
      };
    }
  }

  const envKey = process.env[`${provider.toUpperCase()}_API_KEY`] || ENV_ALIASES[provider];
  if (envKey) {
    return {
      key: envKey,
      model: process.env[`${provider.toUpperCase()}_MODEL`] || LLM_PROVIDERS[provider]?.defaultModel || null,
      account: provider === "gmail" ? process.env.GMAIL_ADDRESS || null : null,
      source: "env",
    };
  }

  return null;
}

// Env names that don't follow the PROVIDER_API_KEY convention.
const ENV_ALIASES = {
  get github() {
    return process.env.GITHUB_TOKEN;
  },
  get gmail() {
    return process.env.GMAIL_APP_PASSWORD;
  },
};

/* ------------------------------------------------------- active provider */

export async function getActiveProvider(companyId) {
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

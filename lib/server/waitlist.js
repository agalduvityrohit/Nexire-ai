// Real persistence for the soft waitlist — see supabase/migrations/0004_waitlist.sql
// for why this exists: /login's "Create account" form doesn't create a real
// account (there's no real auth yet), so a submission lands here instead.
// Same resilience pattern as lib/server/dataStore.js: Supabase when
// configured, an in-memory fallback otherwise.

import { createClient } from "@supabase/supabase-js";

const WAITLIST_TABLE = "waitlist";

const memWaitlist = (globalThis.__nexireWaitlist ||= []);

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function addToWaitlist({ name, email, companyName, companySize, roleTitle }) {
  const row = {
    id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || null,
    email,
    company_name: companyName || null,
    company_size: companySize || null,
    role_title: roleTitle || null,
  };

  if (!supabaseConfigured()) {
    memWaitlist.push(row);
    return row;
  }

  const { data, error } = await client().from(WAITLIST_TABLE).insert(row).select().single();
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
  return data;
}

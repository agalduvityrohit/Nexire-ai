// Interview invitations + slot booking (see 0005 migration).
//
// The emailed link carries a random token — that token IS the candidate's
// credential, so it's 32 random bytes, single-purpose, and expires.

import crypto from "node:crypto";
import { serviceClient } from "@/lib/server/supabase";

const TABLE = "interview_bookings";

export function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createBooking({ companyId, job, candidate, companyName, managerEmail }) {
  const token = newToken();
  const row = {
    token,
    company_id: companyId,
    job_id: job.id,
    candidate_id: candidate.id,
    candidate_name: candidate.name || null,
    candidate_email: candidate.email,
    role_title: job.title,
    company_name: companyName,
    manager_email: managerEmail || null,
    slots: job.interviewSlots || [],
  };
  const { error } = await serviceClient().from(TABLE).insert(row);
  if (error) throw new Error(`Couldn't create the booking: ${error.message}`);
  return token;
}

export async function getBooking(token) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const { data, error } = await serviceClient().from(TABLE).select("*").eq("token", token).maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (!data) return null;
  if (data.status === "pending" && new Date(data.expires_at) < new Date()) return { ...data, status: "expired" };
  return data;
}

/** Slot ids already taken by someone else for this job. */
export async function takenSlotIds(companyId, jobId) {
  const { data, error } = await serviceClient()
    .from(TABLE)
    .select("slot_id")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "booked");
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return new Set((data || []).map((r) => r.slot_id));
}

/** True if this candidate already has a live (pending or booked) invitation for the job. */
export async function hasLiveBooking(companyId, jobId, candidateId) {
  const { data, error } = await serviceClient()
    .from(TABLE)
    .select("token")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId)
    .in("status", ["pending", "booked"])
    .limit(1);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data || []).length > 0;
}

/**
 * Claims a slot. The unique index on (company, job, slot) for booked rows makes
 * this safe against two candidates clicking at once: the loser gets `taken`.
 */
export async function bookSlot(booking, slot) {
  const { data, error } = await serviceClient()
    .from(TABLE)
    .update({ status: "booked", slot_id: slot.id, selected_slot: slot, booked_at: new Date().toISOString() })
    .eq("token", booking.token)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { ok: false, reason: "taken" };
    throw new Error(`Couldn't book the slot: ${error.message}`);
  }
  if (!data) return { ok: false, reason: "not_pending" };
  return { ok: true, booking: data };
}

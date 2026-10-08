// Shortlist → interview invitation.
//
// When a candidate becomes "shortlisted" we email them a personal scheduling
// link (in-person / offline round — the AI interviewer isn't live for real
// candidates yet). This never throws into the caller: shortlisting must always
// succeed, and the outcome is reported so the UI can say what happened.

import { getCandidate, getJob, updateCandidate } from "@/lib/server/dataStore";
import { createBooking, discardBooking, hasLiveBooking, takenSlotIds } from "@/lib/server/bookings";
import { getCompanyById } from "@/lib/server/companies";
import { sendEmail, shortlistEmail } from "@/lib/server/email";
import { serviceClient } from "@/lib/server/supabase";
import { logEvent } from "@/lib/server/events";

function stamp() {
  const now = new Date();
  return `${now.toISOString().slice(0, 10)} · ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

export function appOrigin(request) {
  return (process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
}

/**
 * @param {{ ctx: { companyId, userId, demo }, request, candidateId: string, force?: boolean }} args
 * @returns {Promise<{ status: "sent"|"skipped"|"failed", reason?: string, detail?: string }>}
 */
export async function sendShortlistInvite({ ctx, request, candidateId, force = false }) {
  try {
    if (ctx.demo) return { status: "skipped", reason: "demo" };

    const candidate = await getCandidate(ctx.companyId, candidateId);
    if (!candidate) return { status: "skipped", reason: "not_found" };
    if (!candidate.email) return { status: "skipped", reason: "no_email" };
    if (!candidate.jobId) return { status: "skipped", reason: "no_job" };
    if (candidate.invitedAt && !force) return { status: "skipped", reason: "already_invited" };

    const job = await getJob(ctx.companyId, candidate.jobId);
    if (!job) return { status: "skipped", reason: "no_job" };

    const taken = await takenSlotIds(ctx.companyId, job.id);
    const open = (job.interviewSlots || []).filter((s) => new Date(s.start) > new Date() && !taken.has(s.id));
    if (!open.length) return { status: "skipped", reason: "no_slots" };

    if (!force && (await hasLiveBooking(ctx.companyId, job.id, candidate.id))) {
      return { status: "skipped", reason: "already_invited" };
    }

    const company = await getCompanyById(ctx.companyId);
    let managerEmail = job.hiringManagerEmail || "";
    if (!managerEmail && ctx.userId) {
      const { data } = await serviceClient().auth.admin.getUserById(ctx.userId);
      managerEmail = data?.user?.email || "";
    }

    const token = await createBooking({
      companyId: ctx.companyId,
      job,
      candidate,
      companyName: company?.name || "the hiring team",
      managerEmail,
    });

    const link = `${appOrigin(request)}/schedule/${token}`;
    const mail = shortlistEmail({
      candidateName: candidate.name,
      roleTitle: job.title,
      companyName: company?.name || "the hiring team",
      link,
    });
    const result = await sendEmail({ to: candidate.email, replyTo: managerEmail || undefined, ...mail });

    if (!result.sent) {
      await discardBooking(token).catch(() => {}); // no email went out — don't leave a live invitation behind
      return { status: "failed", reason: result.reason === "not_configured" ? "email_not_configured" : "send_failed", detail: result.reason };
    }

    await updateCandidate(
      ctx.companyId,
      candidate.id,
      { timeline: [...(candidate.timeline || []), { at: stamp(), event: "Shortlist email sent — interview scheduling link", kind: "shortlisted" }] },
      { invited_at: new Date().toISOString() }
    );
    await logEvent({ type: "invites_sent", headers: request.headers, companyId: ctx.companyId, userId: ctx.userId, path: "/dashboard/candidates", meta: { job_id: job.id } });
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", reason: "error", detail: e.message };
  }
}

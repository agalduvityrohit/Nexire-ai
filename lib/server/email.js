// Transactional email via Resend (https://resend.com).
//
// The API key is a platform credential: set RESEND_API_KEY as an environment
// variable, or save it in the admin key screen. EMAIL_FROM must be an address on
// a domain verified in Resend (the default only delivers to your own Resend
// account — fine for testing, useless for real candidates).

import { resolveCredential } from "@/lib/server/keystore";
import { PLATFORM_ID } from "@/lib/server/auth";

const DEFAULT_FROM = "Nexire <onboarding@resend.dev>";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** @returns {{ sent: boolean, reason?: string, id?: string }} — never throws. */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  let cred;
  try {
    cred = await resolveCredential(PLATFORM_ID, "resend");
  } catch (e) {
    return { sent: false, reason: e.message };
  }
  if (!cred?.key) return { sent: false, reason: "not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, reason: json?.message || `Resend HTTP ${res.status}` };
    return { sent: true, id: json.id };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

/* --------------------------------------------------------------- templates */

// The mark as a real PNG (public/email/pulse-mark.png), on a solid white
// background — not inline SVG. Outlook's desktop rendering engine (Word) drops
// <svg> entirely, and several mobile clients are unreliable with it too, so a
// plain <img> to a hosted PNG is the one approach that actually renders
// everywhere. Needs APP_URL set (already required for the schedule link in
// these same emails); silently omitted otherwise rather than showing a
// broken-image icon.
function logoRow() {
  const base = process.env.APP_URL;
  if (!base) return "";
  const src = `${base.replace(/\/$/, "")}/email/pulse-mark.png`;
  return `<tr><td style="padding:28px 32px 4px"><img src="${src}" width="34" height="34" alt="Nexire" style="display:block;border-radius:8px"/></td></tr>`;
}

function shell(inner) {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1f1d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e4e2dc;border-radius:12px">
${logoRow()}
<tr><td style="padding:12px 32px 32px">
${inner}
</td></tr></table>
<p style="font-size:12px;color:#8a8f8c;margin:16px 0 0">Sent by Nexire on behalf of the hiring team.</p>
</td></tr></table></body></html>`;
}

function button(href, label) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="background:#0f5c4d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:9px;display:inline-block">${escapeHtml(label)}</a></p>`;
}

export function formatSlot(slot, timeZone) {
  const opts = {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone || "UTC",
    timeZoneName: "short",
  };
  return new Intl.DateTimeFormat("en-GB", opts).format(new Date(slot.start));
}

export function shortlistEmail({ candidateName, roleTitle, companyName, link }) {
  const first = (candidateName || "").split(" ")[0] || "there";
  const subject = `You've been shortlisted for ${roleTitle} at ${companyName}`;
  const text = `Hi ${first},

Good news — ${companyName} has shortlisted you for the ${roleTitle} role.

The next step is an interview with the team. For now this is an in-person / offline conversation with people from ${companyName} (not the AI interview). Pick a time that works for you here:

${link}

The link is personal to you and stays open for 30 days. If none of the times work, just reply to this email and we'll sort something out.

Congratulations, and thanks for your time so far.

— The ${companyName} hiring team (via Nexire)`;

  const html = shell(`
<h1 style="font-size:20px;margin:0 0 16px">Good news, ${escapeHtml(first)} — you've been shortlisted</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 12px"><strong>${escapeHtml(companyName)}</strong> has shortlisted you for the <strong>${escapeHtml(roleTitle)}</strong> role. Congratulations.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 12px">The next step is an interview with the team. For now this is an <strong>in-person / offline conversation</strong> with people from ${escapeHtml(companyName)} — it isn't the AI interview.</p>
${button(link, "Pick a time for your interview")}
<p style="font-size:13px;line-height:1.6;color:#5c625f;margin:0">This link is personal to you and stays open for 30 days. If none of the times work, just reply to this email and we'll sort something out.</p>`);
  return { subject, text, html };
}

export function otpEmail({ code }) {
  const subject = `${code} is your Nexire sign-in code`;
  const text = `Your Nexire sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = shell(`
<h1 style="font-size:20px;margin:0 0 16px">Your sign-in code</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 20px">Enter this code to continue. It expires in 10 minutes.</p>
<p style="margin:0 0 20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.15em;color:#0f5c4d">${escapeHtml(code)}</p>
<p style="font-size:13px;line-height:1.6;color:#5c625f;margin:0">If you didn't request this, you can safely ignore this email.</p>`);
  return { subject, text, html };
}

export function confirmationEmail({ audience, candidateName, roleTitle, companyName, slot, timeZone }) {
  const when = formatSlot(slot, timeZone);
  const forCandidate = audience === "candidate";
  const note = forCandidate
    ? "Format: in-person / offline with the hiring team — they'll share the location details separately if it isn't already agreed."
    : "The candidate's status in your dashboard is now “Interview Scheduled”.";

  const subject = forCandidate
    ? `Interview confirmed — ${roleTitle} at ${companyName}`
    : `${candidateName} booked an interview — ${roleTitle}`;
  const lead = forCandidate
    ? `Your interview for the <strong>${escapeHtml(roleTitle)}</strong> role at <strong>${escapeHtml(companyName)}</strong> is confirmed.`
    : `<strong>${escapeHtml(candidateName)}</strong> picked a slot for the <strong>${escapeHtml(roleTitle)}</strong> interview.`;
  const leadText = forCandidate
    ? `Your interview for the ${roleTitle} role at ${companyName} is confirmed.`
    : `${candidateName} picked a slot for the ${roleTitle} interview.`;

  const text = `${leadText}\n\nWhen: ${when}\n${note}`;
  const html = shell(`
<h1 style="font-size:20px;margin:0 0 16px">${forCandidate ? "You're booked in" : "Interview scheduled"}</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">${lead}</p>
<table role="presentation" style="background:#f6f5f2;border-radius:9px;width:100%"><tr><td style="padding:16px 18px;font-size:15px;line-height:1.6">
<strong>When</strong><br>${escapeHtml(when)}
</td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#5c625f;margin:16px 0 0">${escapeHtml(note)}</p>`);
  return { subject, text, html };
}

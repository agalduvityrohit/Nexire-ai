// Public, login-free scheduling endpoint. The token in the URL is the only
// credential, so nothing here reveals more than that one invitation needs:
// the candidate's first name, the role, the company, and the offered slots.

import { NextResponse } from "next/server";
import { bookSlot, getBooking, takenSlotIds } from "@/lib/server/bookings";
import { getCandidate, getJob, updateCandidate } from "@/lib/server/dataStore";
import { confirmationEmail, sendEmail } from "@/lib/server/email";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const noStore = { headers: { "Cache-Control": "no-store" } };

function stamp() {
  const now = new Date();
  return `${now.toISOString().slice(0, 10)} · ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

async function loadInvitation(token) {
  const booking = await getBooking(token);
  if (!booking) return null;
  const taken = await takenSlotIds(booking.company_id, booking.job_id);

  // Offer the job's CURRENT slots (the company may have added some since the
  // email went out), falling back to the snapshot if the job is gone.
  const job = await getJob(booking.company_id, booking.job_id);
  const source = job?.interviewSlots?.length ? job.interviewSlots : booking.slots || [];
  const now = Date.now();
  const slots = source
    .filter((s) => new Date(s.start).getTime() > now || s.id === booking.slot_id)
    .map((s) => ({ id: s.id, start: s.start, end: s.end, available: !taken.has(s.id) || s.id === booking.slot_id }));

  return { booking, slots };
}

export async function GET(request, { params }) {
  const { token } = await params;
  if (rateLimited(`schedule-get:${clientIp(request)}`, { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const loaded = await loadInvitation(token);
    if (!loaded) return NextResponse.json({ error: "This link isn't valid." }, { status: 404, ...noStore });

    const { booking, slots } = loaded;
    return NextResponse.json(
      {
        status: booking.status, // pending | booked | cancelled | expired
        firstName: (booking.candidate_name || "").split(" ")[0] || null,
        roleTitle: booking.role_title,
        companyName: booking.company_name,
        slots,
        selected: booking.selected_slot || null,
      },
      noStore
    );
  } catch (e) {
    return NextResponse.json({ error: "Something went wrong. Try again in a moment." }, { status: 500, ...noStore });
  }
}

export async function POST(request, { params }) {
  const { token } = await params;
  if (rateLimited(`schedule-post:${clientIp(request)}`, { max: 15, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    const loaded = await loadInvitation(token);
    if (!loaded) return NextResponse.json({ error: "This link isn't valid." }, { status: 404, ...noStore });

    const { booking, slots } = loaded;
    if (booking.status === "booked") return NextResponse.json({ error: "You've already picked a time." }, { status: 409 });
    if (booking.status !== "pending") return NextResponse.json({ error: "This link has expired." }, { status: 410 });

    const slot = slots.find((s) => s.id === body?.slotId);
    if (!slot) return NextResponse.json({ error: "That time isn't available." }, { status: 400 });
    if (!slot.available) return NextResponse.json({ error: "Sorry, someone just took that time. Pick another." }, { status: 409 });

    const result = await bookSlot(booking, { id: slot.id, start: slot.start, end: slot.end });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason === "taken" ? "Sorry, someone just took that time. Pick another." : "You've already picked a time." },
        { status: 409 }
      );
    }

    // Reflect it on the candidate's record so it shows in the company dashboard.
    const candidate = await getCandidate(booking.company_id, booking.candidate_id);
    if (candidate) {
      await updateCandidate(
        booking.company_id,
        candidate.id,
        {
          status: "interview",
          timeline: [
            ...(candidate.timeline || []),
            { at: stamp(), event: `Interview scheduled — ${new Date(slot.start).toISOString().slice(0, 16).replace("T", " ")} UTC`, kind: "interview" },
          ],
        },
        { interview_at: slot.start, interview_slot_id: slot.id }
      );
    }

    // Confirmation emails are best-effort — the booking itself already succeeded.
    const common = {
      candidateName: booking.candidate_name || "The candidate",
      roleTitle: booking.role_title,
      companyName: booking.company_name,
      slot,
    };
    await Promise.allSettled([
      sendEmail({ to: booking.candidate_email, replyTo: booking.manager_email || undefined, ...confirmationEmail({ audience: "candidate", ...common }) }),
      booking.manager_email
        ? sendEmail({ to: booking.manager_email, ...confirmationEmail({ audience: "manager", ...common }) })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true, slot }, noStore);
  } catch (e) {
    return NextResponse.json({ error: "Something went wrong. Try again in a moment." }, { status: 500, ...noStore });
  }
}

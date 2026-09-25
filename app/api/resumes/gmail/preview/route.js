// Counts what a historical mail import would pull in, without downloading or
// parsing anything. Deliberately cheap: no LLM call, no attachment download —
// so a company can size the job before committing to it.

import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { resolveCredential } from "@/lib/server/keystore";
import { listMailboxes, monthsAgo, scanMailbox } from "@/lib/server/gmail";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request) {
  const { ctx, error: authError } = await authorize(request, { login: true });
  if (authError) return authError;
  const companyId = ctx.companyId; // from the session — any companyId in the request is ignored

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { mailbox = "INBOX", sinceMonths = 3, from = "", withMailboxes = false } = body || {};

  let gmail;
  try {
    gmail = await resolveCredential(companyId, "gmail");
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!gmail?.key) {
    return NextResponse.json(
      { error: "No Gmail connection yet. Add an App Password in Settings → API Connections." },
      { status: 400 }
    );
  }
  if (!gmail.account) {
    return NextResponse.json(
      { error: "No Gmail address saved for this connection. Re-save it with the address filled in." },
      { status: 400 }
    );
  }

  try {
    const [scan, mailboxes] = await Promise.all([
      scanMailbox({
        user: gmail.account,
        password: gmail.key,
        mailbox,
        sinceMonths: Number(sinceMonths) || 0,
        from,
      }),
      withMailboxes
        ? listMailboxes({ user: gmail.account, password: gmail.key }).catch(() => null)
        : Promise.resolve(null),
    ]);

    const since = monthsAgo(Number(sinceMonths) || 0);

    return NextResponse.json({
      account: gmail.account,
      mailbox,
      sinceMonths: Number(sinceMonths) || 0,
      since: since ? since.toISOString() : null,
      ...scan,
      ...(mailboxes ? { mailboxes } : {}),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

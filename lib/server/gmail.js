// Gmail résumé ingestion over IMAP.
//
// Two operations:
//   scanMailbox()             — cheap. Counts messages and résumé attachments in
//                               a window without downloading them. Used to show
//                               a company what a historical import would pull in
//                               before they commit to parsing (and paying for) it.
//   fetchResumeAttachments()  — downloads the attachments for parsing.
//
// WHY IMAP + APP PASSWORD, NOT OAUTH:
// An App Password needs only a Google account with 2FA on — no Cloud project,
// no consent screen, no redirect URI, no token refresh. For a multi-tenant
// product you want OAuth 2.0 with the gmail.readonly scope instead, because App
// Passwords are per-user, can't be scoped down, and many Workspace admins
// disable them. Swapping this module is the only change needed — everything
// downstream takes buffers.

import { ImapFlow } from "imapflow";
import { extensionOf } from "@/lib/server/extract";

const HOST = "imap.gmail.com";
const PORT = 993;
const RESUME_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);

/** Hard ceiling on a preview scan so a five-year mailbox can't hang a request. */
const SCAN_CEILING = 2000;

export function monthsAgo(months) {
  if (!months || months <= 0) return null; // null = no lower bound ("all time")
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function connect({ user, password }) {
  if (!user) throw new Error("No Gmail address configured for this connection.");
  return new ImapFlow({
    host: HOST,
    port: PORT,
    secure: true,
    auth: { user, pass: password },
    logger: false,
    socketTimeout: 60000,
    greetingTimeout: 15000,
  });
}

function friendlyAuthError(error) {
  const message = error?.responseText || error?.message || String(error);
  if (/AUTHENTICATIONFAILED|Invalid credentials/i.test(message)) {
    return new Error(
      "Gmail rejected the login. Use a 16-character App Password (not your account password), and make sure 2-Step Verification is on."
    );
  }
  if (/IMAP.*disabled|not enabled/i.test(message)) {
    return new Error("IMAP is disabled on this account. Enable it in Gmail → Settings → Forwarding and POP/IMAP.");
  }
  if (/\[NONEXISTENT\]|Unknown Mailbox/i.test(message)) {
    return new Error("That mailbox or label doesn't exist on this account.");
  }
  return new Error(message);
}

function buildCriteria({ sinceMonths, from }) {
  const criteria = {};
  const since = monthsAgo(sinceMonths);
  if (since) criteria.since = since;
  if (from && from.trim()) criteria.from = from.trim();
  // `all` keeps imapflow happy when no other criteria are set.
  return Object.keys(criteria).length ? criteria : { all: true };
}

function collectAttachments(node, out = []) {
  if (!node) return out;
  for (const child of node.childNodes || []) collectAttachments(child, out);

  const filename = node.dispositionParameters?.filename || node.parameters?.name;
  if (filename && RESUME_EXTENSIONS.has(extensionOf(filename))) {
    out.push({ part: node.part, filename, size: node.size || 0 });
  }
  return out;
}

/** Lightweight connectivity check for the Test Connection button. */
export async function testGmail({ user, password }) {
  const started = Date.now();
  const client = connect({ user, password });

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen("INBOX", { readOnly: true });
    return {
      ok: true,
      provider: "gmail",
      account: user,
      latencyMs: Date.now() - started,
      messages: mailbox.exists,
    };
  } catch (error) {
    throw friendlyAuthError(error);
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Lists selectable mailboxes/labels so the UI can offer real choices. */
export async function listMailboxes({ user, password }) {
  const client = connect({ user, password });
  try {
    await client.connect();
    const list = await client.list();
    return list
      .filter((m) => !m.flags?.has?.("\\Noselect"))
      .map((m) => m.path)
      .sort((a, b) => (a === "INBOX" ? -1 : b === "INBOX" ? 1 : a.localeCompare(b)));
  } catch (error) {
    throw friendlyAuthError(error);
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Counts what a historical import would find, without downloading anything.
 * Cheap enough to run interactively before committing to a parse run.
 */
export async function scanMailbox({ user, password, mailbox = "INBOX", sinceMonths = 3, from = "" }) {
  const client = connect({ user, password });
  const result = {
    messages: 0,
    withAttachments: 0,
    attachments: 0,
    senders: new Set(),
    oldest: null,
    newest: null,
    capped: false,
  };

  try {
    try {
      await client.connect();
    } catch (error) {
      throw friendlyAuthError(error);
    }

    let lock;
    try {
      lock = await client.getMailboxLock(mailbox);
    } catch (error) {
      throw friendlyAuthError(error);
    }

    try {
      const uids = await client.search(buildCriteria({ sinceMonths, from }), { uid: true });
      const all = uids || [];
      result.messages = all.length;

      // Newest first, so a capped scan still describes recent reality.
      const ordered = all.slice().reverse();
      const window = ordered.slice(0, SCAN_CEILING);
      result.capped = ordered.length > SCAN_CEILING;

      if (window.length) {
        for await (const msg of client.fetch(
          { uid: window.join(",") },
          { uid: true, envelope: true, bodyStructure: true }
        )) {
          const found = collectAttachments(msg.bodyStructure);
          if (found.length) {
            result.withAttachments += 1;
            result.attachments += found.length;
            const addr = msg.envelope?.from?.[0]?.address;
            if (addr) result.senders.add(addr.toLowerCase());
          }
          const date = msg.envelope?.date ? new Date(msg.envelope.date) : null;
          if (date && !Number.isNaN(date.valueOf())) {
            if (!result.oldest || date < result.oldest) result.oldest = date;
            if (!result.newest || date > result.newest) result.newest = date;
          }
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return {
    messages: result.messages,
    scanned: Math.min(result.messages, SCAN_CEILING),
    withAttachments: result.withAttachments,
    attachments: result.attachments,
    uniqueSenders: result.senders.size,
    oldest: result.oldest ? result.oldest.toISOString() : null,
    newest: result.newest ? result.newest.toISOString() : null,
    capped: result.capped,
    scanCeiling: SCAN_CEILING,
  };
}

/**
 * Downloads résumé attachments for parsing.
 *
 * @param {object} args
 * @param {number} [args.sinceMonths] how far back to look; 0 or null = all time
 * @param {number} [args.maxFiles]    safety cap on downloads
 */
export async function fetchResumeAttachments({
  user,
  password,
  mailbox = "INBOX",
  sinceMonths = 3,
  from = "",
  maxFiles = 100,
}) {
  const client = connect({ user, password });
  const docs = [];
  let scanned = 0;

  try {
    try {
      await client.connect();
    } catch (error) {
      throw friendlyAuthError(error);
    }

    let lock;
    try {
      lock = await client.getMailboxLock(mailbox);
    } catch (error) {
      throw friendlyAuthError(error);
    }

    try {
      const uids = await client.search(buildCriteria({ sinceMonths, from }), { uid: true });
      const ordered = (uids || []).slice().reverse(); // newest first

      // One pass to find which messages carry résumé attachments…
      const targets = [];
      const window = ordered.slice(0, SCAN_CEILING);
      if (window.length) {
        for await (const msg of client.fetch(
          { uid: window.join(",") },
          { uid: true, envelope: true, bodyStructure: true }
        )) {
          scanned += 1;
          const found = collectAttachments(msg.bodyStructure);
          if (!found.length) continue;

          const sender = msg.envelope?.from?.[0];
          targets.push({
            uid: msg.uid,
            attachments: found,
            meta: {
              sourceEmail: sender?.address || "",
              sourceFrom: sender ? `${sender.name || ""} <${sender.address}>`.trim() : "",
              sourceSubject: msg.envelope?.subject || "",
              sourceDate: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
            },
          });
          if (targets.reduce((n, t) => n + t.attachments.length, 0) >= maxFiles) break;
        }
      }

      // …then a second pass to download only those.
      for (const target of targets) {
        if (docs.length >= maxFiles) break;
        for (const attachment of target.attachments) {
          if (docs.length >= maxFiles) break;
          const { content } = await client.download(String(target.uid), attachment.part, { uid: true });
          const chunks = [];
          for await (const chunk of content) chunks.push(chunk);
          docs.push({ buffer: Buffer.concat(chunks), filename: attachment.filename, meta: target.meta });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return { docs, scanned };
}

// Candidate de-duplication across a batch.
//
// Isomorphic on purpose: the upload screen sends files in chunks, so dedupe has
// to run over the accumulated set on the client, using exactly the same rules
// the server would apply to a single batch.
//
// Match strength, strongest first:
//   1. email        — normalised, gmail dots/plus-tags folded
//   2. phone        — last 10 digits
//   3. name + top skill overlap — catches the same CV exported twice with no
//      contact details parsed
//
// The first occurrence wins; later ones are recorded against it so the UI can
// show what was merged rather than silently dropping files.

function normaliseEmail(raw = "") {
  const email = String(raw).trim().toLowerCase();
  if (!email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "";
  const isGoogle = domain === "gmail.com" || domain === "googlemail.com";
  const base = local.split("+")[0];
  return `${isGoogle ? base.replace(/\./g, "") : base}@${domain}`;
}

function normalisePhone(raw = "") {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function normaliseName(raw = "") {
  return String(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function skillSet(record) {
  return new Set((record.skills || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean));
}

function skillOverlap(a, b) {
  const setA = skillSet(a);
  const setB = skillSet(b);
  if (setA.size < 3 || setB.size < 3) return 0;
  let shared = 0;
  for (const skill of setA) if (setB.has(skill)) shared += 1;
  return shared / Math.min(setA.size, setB.size);
}

/**
 * @param {Array<object>} records parsed resumes (each may carry `filename`)
 * @param {Array<object>} existing already-stored candidates to check the batch against,
 *   so re-uploading the same person days later doesn't create a second entry. Never
 *   included in the returned `unique`/`duplicates` lists — only used for matching.
 * @returns {{unique: Array<object>, duplicates: Array<object>, duplicateCount: number}}
 */
export function dedupeCandidates(records, existing = []) {
  const unique = [];
  const duplicates = [];

  const byEmail = new Map();
  const byPhone = new Map();
  const byName = new Map();

  // Seed the match maps with what's already stored — a stub, never the real
  // object, so nothing here ever mutates already-persisted candidate state.
  for (const record of existing) {
    const email = normaliseEmail(record.email);
    const phone = normalisePhone(record.phone);
    const name = normaliseName(record.name);
    const stub = {
      name: record.name,
      filename: record.resumeFile || record.name,
      // Stored candidates carry {name, level, years} objects; skillSet() needs strings.
      skills: (record.skills || []).map((s) => (typeof s === "string" ? s : s?.name)).filter(Boolean),
    };

    if (email) byEmail.set(email, stub);
    if (phone) byPhone.set(phone, stub);
    if (name) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(stub);
    }
  }

  for (const record of records) {
    const email = normaliseEmail(record.email);
    const phone = normalisePhone(record.phone);
    const name = normaliseName(record.name);

    let match = null;
    let reason = "";

    if (email && byEmail.has(email)) {
      match = byEmail.get(email);
      reason = "same email";
    } else if (phone && byPhone.has(phone)) {
      match = byPhone.get(phone);
      reason = "same phone number";
    } else if (name && byName.has(name)) {
      for (const candidate of byName.get(name)) {
        if (skillOverlap(record, candidate) >= 0.6) {
          match = candidate;
          reason = "same name and overlapping skills";
          break;
        }
      }
    }

    if (match) {
      match.duplicateOf = match.duplicateOf || [];
      match.duplicateOf.push(record.filename || record.name || "unnamed file");
      duplicates.push({ ...record, mergedInto: match.filename || match.name, reason });
      continue;
    }

    unique.push(record);
    if (email) byEmail.set(email, record);
    if (phone) byPhone.set(phone, record);
    if (name) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(record);
    }
  }

  return { unique, duplicates, duplicateCount: duplicates.length };
}

/** Counts per role, ordered by the canonical role list then by count. */
export function groupByRole(records, roleLabels) {
  const counts = new Map(roleLabels.map((label) => [label, []]));
  for (const record of records) {
    const role = counts.has(record.role) ? record.role : "Other";
    counts.get(role).push(record);
  }
  return roleLabels
    .map((label) => ({ role: label, count: counts.get(label).length, candidates: counts.get(label) }))
    .filter((group) => group.count > 0)
    .sort((a, b) => b.count - a.count);
}

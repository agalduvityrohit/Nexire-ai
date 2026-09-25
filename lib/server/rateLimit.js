// Best-effort in-memory rate limiter. Serverless instances don't share memory,
// so this is a speed bump against casual abuse (login guessing, signup spam),
// not a hard guarantee. Put Vercel's WAF / Upstash in front for real limits.

const buckets = (globalThis.__nexireRate ||= new Map());

export function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip")) || "unknown";
}

/** Returns true when the caller is over the limit. */
export function rateLimited(key, { max, windowMs }) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return false;
}

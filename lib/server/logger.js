// Minimal structured logging for the pilot stage — not a full observability
// platform, just enough to notice a real problem without asking each company
// directly. Vercel captures stdout/stderr automatically (Project → Logs), so
// plain console output is sufficient here.

function write(level, event, data) {
  const line = { level, event, time: new Date().toISOString(), ...data };
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(JSON.stringify(line));
}

export const logInfo = (event, data = {}) => write("info", event, data);
export const logWarn = (event, data = {}) => write("warn", event, data);
export const logError = (event, data = {}) => write("error", event, data);

/**
 * Logs the real exception server-side (message + stack, plus context like
 * companyId — never the request body, which can hold credentials) and returns
 * a generic message safe to send to the browser. Use this in every API route's
 * catch block instead of `error.message`, so a Supabase error, a stack trace,
 * or a schema/table name is never exposed to a client — accidentally or
 * (for a company probing another company's data) deliberately.
 */
export function serverError(event, error, context = {}) {
  logError(event, { message: error?.message, stack: error?.stack, ...context });
  return "Something went wrong on our end. Try again in a moment.";
}

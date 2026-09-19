// Shared résumé processing: extract -> parse+classify -> collect.
// Used by both the manual upload route and the Gmail import route so the two
// can never diverge.

import crypto from "node:crypto";
import { LLM_PROVIDERS } from "@/lib/providers";
import { parseAndClassify } from "@/lib/server/llm";
import { extractFromBuffer, UnsupportedFileError } from "@/lib/server/extract";
import { classifyHeuristically } from "@/lib/server/heuristic";
import { getCachedParse, saveCachedParse } from "@/lib/server/dataStore";

const CONCURRENCY = 3;

export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * @param {Array<{buffer: Buffer, filename: string, meta?: object}>} docs
 * @param {{providerId: string|null, apiKey: string|null, model: string|null}} llm
 * @param {{companyId?: string}} opts companyId enables the parse cache — a
 *   byte-identical file already parsed for this company skips the model call.
 */
export async function processResumes(docs, llm, { companyId } = {}) {
  const useLlm = Boolean(llm?.apiKey && llm?.providerId);
  const nativePdf = useLlm ? Boolean(LLM_PROVIDERS[llm.providerId]?.nativePdf) : false;
  const isAnthropic = useLlm && LLM_PROVIDERS[llm.providerId]?.kind === "anthropic";

  const records = await mapWithConcurrency(docs, CONCURRENCY, async (doc) => {
    const base = { filename: doc.filename, sizeBytes: doc.buffer.length, ...(doc.meta || {}) };
    const resumeHash = hashBuffer(doc.buffer);

    try {
      if (useLlm && companyId) {
        const cached = await getCachedParse(companyId, resumeHash).catch(() => null);
        if (cached) {
          return { ...base, ...cached.parsed, source: cached.provider || llm.providerId, resumeHash, cached: true };
        }
      }

      const content = await extractFromBuffer(doc.buffer, doc.filename);

      if (!useLlm) {
        return { ...base, ...classifyHeuristically(content.text, doc.filename), source: "heuristic", resumeHash };
      }

      // Send the PDF itself only to providers that accept one; everyone else
      // gets the locally extracted text.
      const sendPdf = content.pdfBase64 && (nativePdf || isAnthropic);

      if (!sendPdf && !content.text) {
        throw new UnsupportedFileError(
          "No text could be extracted (likely a scanned PDF). Switch to Gemini or Claude, which read PDFs directly."
        );
      }

      const parsed = await parseAndClassify({
        providerId: llm.providerId,
        apiKey: llm.apiKey,
        model: llm.model,
        text: sendPdf ? undefined : content.text,
        pdfBase64: sendPdf ? content.pdfBase64 : undefined,
        filename: doc.filename,
      });

      if (companyId) {
        await saveCachedParse(companyId, resumeHash, parsed, {
          provider: llm.providerId,
          model: llm.model,
        }).catch(() => {}); // a cache-write failure shouldn't fail this file's result
      }

      return { ...base, ...parsed, source: llm.providerId, resumeHash };
    } catch (error) {
      return { ...base, failed: true, error: error.message || "Parsing failed." };
    }
  });

  return {
    parsed: records.filter((r) => !r.failed),
    failed: records.filter((r) => r.failed),
    cachedCount: records.filter((r) => !r.failed && r.cached).length,
  };
}

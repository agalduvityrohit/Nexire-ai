// Turn an uploaded file into something an LLM can read.
//
// PDF  -> kept as base64 for providers with native PDF input (Gemini, Claude),
//         and ALSO text-extracted locally so text-only providers (OpenAI,
//         Groq, Cerebras, Mistral, OpenRouter) can handle it.
// DOCX -> text extracted with mammoth
// TXT  -> read directly
// DOC  -> NOT supported. The legacy binary Word format needs a heavyweight
//         converter; we reject it explicitly rather than emitting junk.

import mammoth from "mammoth";

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

// Vercel already caps the whole request body at ~4.5 MB, so these mainly guard
// self-hosted or future deployments without that platform limit, and give a
// clean 400 instead of a truncated connection either way.
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 40;

export function extensionOf(filename = "") {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

/**
 * Server-side gate on an upload batch, run BEFORE any file is buffered or
 * sent to an LLM. Client-side checks (accept="", a size hint in the UI) are
 * only a courtesy — this is the one that actually holds.
 * @returns {{ ok: true, accepted: File[], rejected: {name:string, error:string}[] } | { ok: false, error: string }}
 */
export function validateUploadBatch(files) {
  if (files.length > MAX_FILES_PER_REQUEST) {
    return { ok: false, error: `Too many files at once (max ${MAX_FILES_PER_REQUEST}). Upload in smaller batches.` };
  }
  const accepted = [];
  const rejected = [];
  for (const file of files) {
    const filename = file.name || "file";
    if (!ACCEPTED_EXTENSIONS.includes(extensionOf(filename))) {
      rejected.push({ filename, failed: true, error: `Unsupported file type. Use ${ACCEPTED_EXTENSIONS.join(", ")}.` });
    } else if (file.size > MAX_FILE_BYTES) {
      rejected.push({ filename, failed: true, error: `File is too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB).` });
    } else {
      accepted.push(file);
    }
  }
  return { ok: true, accepted, rejected };
}

export class UnsupportedFileError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

// pdf-parse v2 is ESM-native and exports a PDFParse class (v1's default-export
// function and the `pdf-parse/lib/...` deep import are both gone). Loaded lazily
// so a PDF-free request never pays for it.
async function pdfToText(buffer) {
  let parser = null;
  try {
    const { PDFParse } = await import("pdf-parse");
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const { text } = await parser.getText();
    // v2 appends a "-- n of m --" page footer to each page; strip it.
    return (text || "").replace(/^--\s*\d+\s*of\s*\d+\s*--$/gm, "").trim();
  } catch {
    // Scanned/image-only PDFs legitimately have no text layer. Not fatal —
    // native-PDF providers can still read them from the base64.
    return "";
  } finally {
    await parser?.destroy?.().catch(() => {});
  }
}

/**
 * @returns {Promise<{ text: string, pdfBase64: string|null }>}
 *   `text` may be "" for image-only PDFs; `pdfBase64` is null for non-PDFs.
 */
export async function extractContent(file) {
  const ext = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === ".pdf") {
    return { text: await pdfToText(buffer), pdfBase64: buffer.toString("base64") };
  }

  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = (value || "").trim();
    if (!text) throw new UnsupportedFileError("No readable text found in this .docx.");
    return { text, pdfBase64: null };
  }

  if (ext === ".txt" || ext === ".md") {
    const text = buffer.toString("utf8").trim();
    if (!text) throw new UnsupportedFileError("File is empty.");
    return { text, pdfBase64: null };
  }

  if (ext === ".doc") {
    throw new UnsupportedFileError(
      "Legacy .doc files aren't supported — re-save as .docx or PDF and upload again."
    );
  }

  throw new UnsupportedFileError(`Unsupported file type "${ext || "unknown"}".`);
}

/** Same pipeline for a buffer that didn't arrive as a browser File (e.g. Gmail). */
export async function extractFromBuffer(buffer, filename) {
  const fakeFile = {
    name: filename,
    size: buffer.length,
    arrayBuffer: async () => buffer,
  };
  return extractContent(fakeFile);
}

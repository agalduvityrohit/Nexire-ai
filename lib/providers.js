// LLM provider registry. Shared by the server adapters and the Settings UI, so
// there is one source of truth for what's supported.
//
// MODEL IDS CHANGE OFTEN. Every default below is editable per-company in
// Settings → API Connections; if a provider rejects the id, its own error is
// shown verbatim so you know to update it rather than guessing.

export const LLM_PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    kind: "gemini",
    defaultModel: "gemini-2.5-flash",
    keyHint: "AIza…",
    where: "aistudio.google.com/apikey",
    nativePdf: true,
  },
  openai: {
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyHint: "sk-…",
    where: "platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-5",
    keyHint: "sk-ant-…",
    where: "console.anthropic.com/settings/keys",
  },
  groq: {
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyHint: "gsk_…",
    where: "console.groq.com/keys",
  },
  cerebras: {
    label: "Cerebras",
    kind: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
    keyHint: "csk-…",
    where: "cloud.cerebras.ai",
  },
  mistral: {
    label: "Mistral",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    keyHint: "…",
    where: "console.mistral.ai/api-keys",
  },
  openrouter: {
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    keyHint: "sk-or-…",
    where: "openrouter.ai/keys",
  },
  nvidia: {
    label: "NVIDIA NIM",
    kind: "openai",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.3-70b-instruct",
    keyHint: "nvapi-…",
    where: "build.nvidia.com — generate a key from any model page",
  },
};

export const LLM_PROVIDER_IDS = Object.keys(LLM_PROVIDERS);

/** Non-LLM credentials that also live in the keystore. */
export const OTHER_PROVIDERS = {
  github: {
    label: "GitHub",
    keyHint: "ghp_… or github_pat_…",
    where: "github.com/settings/tokens",
    note: "Reads public repositories and commit history when sourcing candidates.",
  },
  gmail: {
    label: "Gmail (App Password)",
    keyHint: "16-character app password",
    where: "myaccount.google.com/apppasswords",
    note: "Pulls résumé attachments from an inbox over IMAP. Requires 2FA on the account.",
  },
};

export const ALL_PROVIDER_IDS = [...LLM_PROVIDER_IDS, ...Object.keys(OTHER_PROVIDERS)];

export function providerLabel(id) {
  return LLM_PROVIDERS[id]?.label || OTHER_PROVIDERS[id]?.label || id;
}

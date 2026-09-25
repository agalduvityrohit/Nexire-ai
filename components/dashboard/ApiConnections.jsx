"use client";

// Settings → API Connections.
//
// Two distinct concerns, deliberately kept apart:
//   1. Model providers — interchangeable engines for résumé parsing. One
//      dropdown, one panel, one of them active at a time.
//   2. Service connections — GitHub and Gmail. Not interchangeable, not
//      parsing engines; they do their own jobs and can both be on at once.
//
// Keys are POSTed to /api/settings/keys, encrypted server-side, and never
// returned to the browser — only a masked "•••• connected" state comes back.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge, Button, Card, Field, Input, SectionTitle, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { LLM_PROVIDERS, LLM_PROVIDER_IDS, OTHER_PROVIDERS } from "@/lib/providers";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SERVICE_META = {
  github: {
    icon: Icon.Link,
    purpose: "Candidate sourcing",
    blurb: "Reads public repositories and commit history to match what people have actually built.",
  },
  gmail: {
    icon: Icon.Mail,
    purpose: "Résumé intake",
    blurb: "Pulls PDF and DOCX attachments out of an inbox over IMAP so applications land in the pipeline.",
  },
  vapi: {
    icon: Icon.Mic,
    purpose: "Voice interviews",
    blurb: "Voice layer for the AI interviewer. Stored for later — not used for live candidates yet.",
  },
  deepgram: {
    icon: Icon.Waves,
    purpose: "Speech-to-text",
    blurb: "Transcription for interviews. Stored for later — not used for live candidates yet.",
  },
  resend: {
    icon: Icon.Mail,
    purpose: "Transactional email",
    blurb: "Sends the shortlist and interview-confirmation emails to candidates and hiring managers.",
  },
};

/**
 * mode="admin"   — the operator's platform keys (model providers, GitHub, Vapi,
 *                  Deepgram, Resend). Only ever rendered on /admin/keys.
 * mode="company" — a company's own connections. Just Gmail; the AI keys are
 *                  the platform's and deliberately invisible here.
 */
export function ApiConnections({ mode = "company" }) {
  const { session, notify } = useStore();
  const companyId = session?.company?.id || "demo-company";

  const [status, setStatus] = useState(null);
  const [activeProvider, setActive] = useState("gemini");
  const [storage, setStorage] = useState(null);
  const [encryptionReady, setEncryptionReady] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (isRetry = false) => {
      try {
        const res = await fetch(`/api/settings/keys?companyId=${encodeURIComponent(companyId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Couldn't load connections.");
        setStatus(json.status);
        setActive(json.activeProvider);
        setStorage(json.storage);
        setEncryptionReady(json.encryptionReady);
        setError("");
      } catch (e) {
        // Supabase occasionally throws a transient error right after a key was
        // rotated (edge propagation lag) — one silent retry clears most of
        // these before they're ever shown as a real failure.
        if (!isRetry) {
          setTimeout(() => load(true), 1200);
          return;
        }
        setError(e.message);
      }
    },
    [companyId]
  );

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------------------------- shared API helpers */

  const api = useMemo(
    () => ({
      async save(provider, payload) {
        const res = await fetch("/api/settings/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, provider, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Save failed.");
        if (json.status) setStatus(json.status);
        if (json.activeProvider) setActive(json.activeProvider);
        if (json.storage) setStorage(json.storage);
        return json;
      },
      async test(provider, payload) {
        const res = await fetch("/api/settings/keys/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, provider, ...payload }),
        });
        return res.json();
      },
      async listModels(provider, payload) {
        const res = await fetch("/api/settings/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, provider, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Couldn't load models.");
        return json.models;
      },
      async remove(provider) {
        const res = await fetch(
          `/api/settings/keys?companyId=${encodeURIComponent(companyId)}&provider=${provider}`,
          { method: "DELETE" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Disconnect failed.");
        setStatus(json.status);
        return json;
      },
    }),
    [companyId]
  );

  return (
    <div className="space-y-4">
      {!encryptionReady && (
        <Banner tone="danger" title="Encryption key missing.">
          Set <code className="font-mono">APP_ENCRYPTION_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> before saving any credentials. Saving is disabled.
        </Banner>
      )}

      {storage === "memory" && (
        <Banner tone="warn" title="Not persisted.">
          Supabase isn&apos;t configured, so credentials are held in server memory and clear when the
          process restarts. Set <code className="font-mono">SUPABASE_URL</code> and{" "}
          <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>, then run the{" "}
          <code className="font-mono">0002_provider_keys.sql</code> migration.
        </Banner>
      )}

      {error && (
        <div className="rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      {mode === "admin" && (
        <>
          {/* ============================================ 1. parsing engine */}
          <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
            Model provider — powers résumé parsing for every company
          </div>

          <ModelProviderSection
            status={status}
            activeProvider={activeProvider}
            api={api}
            notify={notify}
            encryptionReady={encryptionReady}
            onError={setError}
          />
        </>
      )}

      {/* ========================================= 2. service connections */}
      <div className="pt-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
        {mode === "admin" ? "Platform services — shared by every company" : "Your résumé inbox"}
      </div>
      <p className="-mt-2 text-[12.5px] leading-relaxed text-muted">
        {mode === "admin"
          ? "These run every company's dashboard. Companies never see or edit them. Keys set as environment variables also show as connected here."
          : "Connect a Gmail inbox and Nexire pulls résumé attachments into your pipeline. This is your own mailbox — nobody else can see it, and Nexire's AI runs on the platform's keys, so there's nothing else to set up."}
      </p>

      {(mode === "admin" ? Object.keys(OTHER_PROVIDERS).filter((id) => id !== "gmail") : ["gmail"]).map((id) => (
        <ServiceCard
          key={id}
          id={id}
          cfg={OTHER_PROVIDERS[id]}
          state={status?.[id]}
          api={api}
          notify={notify}
          encryptionReady={encryptionReady}
          onError={setError}
        />
      ))}

      <Card className="flex items-start gap-2.5 border-dashed p-4">
        <Icon.Shield size={15} className="mt-0.5 shrink-0 text-primary/70" />
        <p className="text-[12px] leading-relaxed text-muted">
          Credentials are encrypted with AES-256-GCM before they reach the database and are never sent back
          to the browser.{" "}
          <span className="font-medium text-ink-soft">
            {mode === "admin" ? "Only admin accounts can change these" : "Only your own account can see this"}
          </span>
          .
        </p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------ 1. model providers */

function ModelProviderSection({ status, activeProvider, api, notify, encryptionReady, onError }) {
  const [selected, setSelected] = useState("gemini");
  const [keyDraft, setKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [busy, setBusy] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const [models, setModels] = useState(null); // null = not loaded yet
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [manualModel, setManualModel] = useState(false);

  const cfg = LLM_PROVIDERS[selected];
  const state = status?.[selected];
  const connected = Boolean(state?.connected);
  const isActive = activeProvider === selected;

  const loadModels = useCallback(
    async (inlineKey) => {
      setModelsLoading(true);
      setModelsError("");
      try {
        const list = await api.listModels(selected, { value: inlineKey || undefined });
        setModels(list);
        setManualModel(false);
        if (!list.length) setModelsError("That key didn't return any models.");
      } catch (e) {
        setModelsError(e.message);
        setModels(null);
      } finally {
        setModelsLoading(false);
      }
    },
    [api, selected]
  );

  useEffect(() => {
    setKeyDraft("");
    setTestResult(null);
    setModelDraft(status?.[selected]?.model || LLM_PROVIDERS[selected]?.defaultModel || "");
    setModels(null);
    setModelsError("");
    setManualModel(false);
    // Already connected — the stored key can list models right away, no need
    // to wait for the employer to type it again or go find it on the
    // provider's own site.
    if (status?.[selected]?.connected) loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, status]);

  const connectedCount = useMemo(
    () => LLM_PROVIDER_IDS.filter((id) => status?.[id]?.connected).length,
    [status]
  );

  async function run(label, fn) {
    setBusy(label);
    onError("");
    try {
      await fn();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* currently in use */}
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
          <Icon.Sparkle size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Parsing with</div>
          <div className="mt-0.5 text-[14px] font-semibold text-ink">
            {LLM_PROVIDERS[activeProvider]?.label || "—"}
            {status?.[activeProvider]?.connected ? (
              <span className="ml-2 font-mono text-[12px] font-normal text-muted">
                {status[activeProvider].model}
              </span>
            ) : (
              <span className="ml-2 text-[12px] font-normal text-warn">no key — heuristic fallback</span>
            )}
          </div>
        </div>
        <Badge tone={connectedCount ? "success" : "warn"} className="ml-auto">
          {connectedCount} of {LLM_PROVIDER_IDS.length} connected
        </Badge>
      </Card>

      <Card className="p-5">
        <Field label="Choose a model provider" htmlFor="provider-select" hint="· one active at a time">
          <Select
            id="provider-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-11 text-[14px]"
          >
            {LLM_PROVIDER_IDS.map((id) => {
              const s = status?.[id];
              const suffix = !s
                ? ""
                : activeProvider === id && s.connected
                  ? " — connected · in use"
                  : s.connected
                    ? " — connected"
                    : " — not connected";
              return (
                <option key={id} value={id}>
                  {LLM_PROVIDERS[id].label}
                  {suffix}
                </option>
              );
            })}
          </Select>
        </Field>

        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mt-5 border-t border-line pt-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-ink">{cfg.label}</h3>
                {isActive && <Badge tone="primary">In use for parsing</Badge>}
              </div>
              <p className="mt-1 text-[12.5px] text-muted">Get a key from {cfg.where}</p>
            </div>
            {connected ? (
              <Badge tone="success" dot>
                •••• {state.last4}
              </Badge>
            ) : (
              <Badge tone="neutral">Not connected</Badge>
            )}
          </div>

          <Field
            label={connected ? "Replace key" : "API key"}
            htmlFor="provider-key"
            className="mt-4"
            hint={`· ${cfg.keyHint}`}
          >
            <Input
              id="provider-key"
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={cfg.keyHint}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field
            label="Model"
            htmlFor="provider-model"
            className="mt-4"
            hint={!manualModel && models?.length ? "· straight from the provider's catalog" : "· change this if the provider rejects the default"}
          >
            {!manualModel && models?.length > 0 ? (
              <Select
                id="provider-model"
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                className="h-11 text-[14px]"
              >
                {modelDraft && !models.includes(modelDraft) && (
                  <option value={modelDraft}>{modelDraft} (current — not in catalog)</option>
                )}
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="provider-model"
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                placeholder={cfg.defaultModel}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
            {modelsLoading && <span className="text-muted">Loading models…</span>}
            {!modelsLoading && (keyDraft.trim() || connected) && (
              <button
                type="button"
                onClick={() => loadModels(keyDraft.trim() || undefined)}
                className="font-medium text-primary hover:underline"
              >
                {models ? "Refresh models" : "Load available models"}
              </button>
            )}
            {models?.length > 0 && (
              <button
                type="button"
                onClick={() => setManualModel((v) => !v)}
                className="text-muted hover:text-ink-soft"
              >
                {manualModel ? "Choose from the list instead" : "Type a model id manually instead"}
              </button>
            )}
            {modelsError && <span className="text-danger">{modelsError}</span>}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              disabled={busy !== null || !keyDraft.trim() || !encryptionReady}
              onClick={() =>
                run("save", async () => {
                  await api.save(selected, { value: keyDraft.trim(), model: modelDraft });
                  setKeyDraft("");
                  setTestResult(null);
                  notify(`${cfg.label} connected`);
                })
              }
            >
              {busy === "save" ? "Saving…" : connected ? "Replace key" : "Connect"}
            </Button>

            <Button
              variant="secondary"
              size="md"
              disabled={busy !== null || (!connected && !keyDraft.trim())}
              onClick={() =>
                run("test", async () => {
                  setTestResult(null);
                  const result = await api.test(selected, {
                    value: keyDraft.trim() || undefined,
                    model: modelDraft,
                  });
                  setTestResult(result);
                })
              }
            >
              {busy === "test" ? "Testing…" : "Test connection"}
            </Button>

            {connected && !isActive && (
              <Button
                variant="accent"
                size="md"
                disabled={busy !== null}
                onClick={() => run("active", () => api.save(selected, { action: "setActive" }))}
              >
                {busy === "active" ? "Switching…" : "Use for parsing"}
              </Button>
            )}

            {connected && modelDraft.trim() && modelDraft.trim() !== state?.model && (
              <Button
                variant="ghost"
                size="md"
                disabled={busy !== null}
                onClick={() => run("model", () => api.save(selected, { action: "setModel", model: modelDraft }))}
              >
                {busy === "model" ? "Saving…" : "Save model"}
              </Button>
            )}

            {connected && (
              <Button
                variant="ghost"
                size="md"
                className="ml-auto"
                disabled={busy !== null}
                onClick={() =>
                  run("del", async () => {
                    await api.remove(selected);
                    setTestResult(null);
                    notify("Key removed");
                  })
                }
              >
                Disconnect
              </Button>
            )}
          </div>

          <TestResult result={testResult} provider={selected} />

          {connected && (
            <p className="mt-4 border-t border-line-soft pt-3 text-[11.5px] text-faint">
              Added {state.connectedAt ? new Date(state.connectedAt).toLocaleString() : "—"} · stored
              encrypted, never shown again
            </p>
          )}
        </motion.div>
      </Card>
    </>
  );
}

/* ------------------------------------ 2. GitHub / Gmail, self-contained */

function ServiceCard({ id, cfg, state, api, notify, encryptionReady, onError }) {
  const meta = SERVICE_META[id] || {};
  const Glyph = meta.icon || Icon.Link;
  const needsAccount = id === "gmail";

  const [keyDraft, setKeyDraft] = useState("");
  const [accountDraft, setAccountDraft] = useState("");
  const [busy, setBusy] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const connected = Boolean(state?.connected);

  useEffect(() => {
    if (state?.account) setAccountDraft((a) => a || state.account);
  }, [state?.account]);

  async function run(label, fn) {
    setBusy(label);
    onError("");
    try {
      await fn();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-canvas-deep text-primary">
            <Glyph size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-ink">{cfg.label}</h3>
              {meta.purpose && <Badge tone="neutral">{meta.purpose}</Badge>}
            </div>
            <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-muted">{meta.blurb}</p>
            <p className="mt-1 text-[11.5px] text-faint">Get it from {cfg.where}</p>
          </div>
        </div>
        {connected ? (
          <Badge tone="success" dot>
            •••• {state.last4}
          </Badge>
        ) : (
          <Badge tone="neutral">Not connected</Badge>
        )}
      </div>

      {needsAccount && (
        <Field label="Gmail address" htmlFor={`acct-${id}`} className="mt-4">
          <Input
            id={`acct-${id}`}
            value={accountDraft}
            onChange={(e) => setAccountDraft(e.target.value)}
            placeholder="recruiting@yourcompany.com"
            autoComplete="off"
          />
        </Field>
      )}

      <Field
        label={connected ? "Replace credential" : needsAccount ? "App password" : "Access token"}
        htmlFor={`key-${id}`}
        className="mt-4"
        hint={`· ${cfg.keyHint}`}
      >
        <Input
          id={`key-${id}`}
          type="password"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          placeholder={cfg.keyHint}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="md"
          disabled={busy !== null || !keyDraft.trim() || !encryptionReady}
          onClick={() =>
            run("save", async () => {
              await api.save(id, { value: keyDraft.trim(), account: accountDraft });
              setKeyDraft("");
              setTestResult(null);
              notify(`${cfg.label} connected`);
            })
          }
        >
          {busy === "save" ? "Saving…" : connected ? "Replace" : "Connect"}
        </Button>

        <Button
          variant="secondary"
          size="md"
          disabled={busy !== null || (!connected && !keyDraft.trim())}
          onClick={() =>
            run("test", async () => {
              setTestResult(null);
              const result = await api.test(id, {
                value: keyDraft.trim() || undefined,
                account: accountDraft,
              });
              setTestResult(result);
            })
          }
        >
          {busy === "test" ? "Testing…" : "Test connection"}
        </Button>

        {connected && (
          <Button
            variant="ghost"
            size="md"
            className="ml-auto"
            disabled={busy !== null}
            onClick={() =>
              run("del", async () => {
                await api.remove(id);
                setTestResult(null);
                notify(`${cfg.label} disconnected`);
              })
            }
          >
            Disconnect
          </Button>
        )}
      </div>

      <TestResult result={testResult} provider={id} />

      {connected && (
        <p className="mt-4 border-t border-line-soft pt-3 text-[11.5px] text-faint">
          Added {state.connectedAt ? new Date(state.connectedAt).toLocaleString() : "—"} · stored encrypted,
          never shown again
        </p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------- shared */

function TestResult({ result, provider }) {
  if (!result) return null;
  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5",
        result.ok ? "border-success/25 bg-success-soft" : "border-danger/25 bg-danger-soft"
      )}
    >
      {result.ok ? (
        <Icon.Check size={14} className="mt-0.5 shrink-0 text-success" />
      ) : (
        <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
      )}
      <div className="min-w-0 text-[12.5px] leading-relaxed">
        {result.ok ? (
          <span className="text-success">
            <span className="font-semibold">Works.</span>{" "}
            {provider === "github"
              ? `Authenticated as ${result.account} · ${result.scopes}`
              : provider === "gmail"
                ? `${result.account} · ${result.messages} messages in INBOX · ${result.latencyMs}ms`
                : `${result.model} replied in ${result.latencyMs}ms`}
          </span>
        ) : (
          <span className="text-danger">
            <span className="font-semibold">Failed.</span> {result.error}
          </span>
        )}
      </div>
    </div>
  );
}

function Banner({ tone, title, children }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-card border px-4 py-3",
        tone === "danger" ? "border-danger/25 bg-danger-soft" : "border-warn/25 bg-warn-soft"
      )}
    >
      <Icon.Warning size={15} className={cn("mt-0.5 shrink-0", tone === "danger" ? "text-danger" : "text-warn")} />
      <div className="text-[12.5px] leading-relaxed text-ink-soft">
        <span className={cn("font-semibold", tone === "danger" ? "text-danger" : "text-warn")}>{title}</span>{" "}
        {children}
      </div>
    </div>
  );
}

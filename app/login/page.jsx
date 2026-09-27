"use client";

// Two coexisting paths: a real account (email + password, or an emailed code
// — either → that company's own isolated dashboard) and the no-signup demo
// (a sandbox with nothing in it that belongs to anyone).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/public/AuthShell";
import { Badge, Button, Card, Field, Input } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function LoginPage() {
  const router = useRouter();
  const { loadSession } = useStore();
  const [mode, setMode] = useState("password"); // password | code | code-entry
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function afterSignedIn(company) {
    await loadSession();
    router.push(company?.role === "admin" ? "/admin" : "/dashboard");
  }

  async function submitPassword(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Enter your email and password.");

    setPending(true);
    const { ok, json } = await postJson("/api/auth/login", { email: email.trim(), password });
    setPending(false);
    if (!ok) return setError(json.error || "Couldn't sign you in.");
    afterSignedIn(json.company);
  }

  async function requestCode(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Enter your email.");

    setPending(true);
    const { ok, status, json } = await postJson("/api/auth/otp/request", { email: email.trim() });
    setPending(false);
    if (!ok) {
      if (status === 503) return setError("Email sign-in isn't available yet — use your password instead.");
      return setError(json.error || "Couldn't send the code.");
    }
    setMode("code-entry");
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code.");

    setPending(true);
    const { ok, json } = await postJson("/api/auth/otp/verify", { email: email.trim(), code: code.trim() });
    setPending(false);
    if (!ok) return setError(json.error || "That code isn't right.");
    afterSignedIn(json.company);
  }

  return (
    <AuthShell>
      <Badge tone="warn" className="mx-auto mb-4 flex w-fit sm:hidden">
        Prototype · mock data
      </Badge>

      {/* ------------------------------------------------------- real account */}
      <Card className="p-6">
        <div className="text-center">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Sign in to Nexire</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">Your company&apos;s own workspace — jobs, candidates and pipeline.</p>
        </div>

        {mode === "password" && (
          <form onSubmit={submitPassword} className="mt-5 space-y-4">
            <Field label="Work email" htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Password" htmlFor="password" error={error || undefined}>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoComplete="current-password"
              />
            </Field>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
              {!pending && <Icon.ArrowRight size={16} />}
            </Button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode("code");
              }}
              className="w-full text-center text-[12.5px] font-medium text-muted hover:text-ink"
            >
              Email me a one-time code instead
            </button>
          </form>
        )}

        {mode === "code" && (
          <form onSubmit={requestCode} className="mt-5 space-y-4">
            <Field label="Work email" htmlFor="email-otp" error={error || undefined}>
              <Input id="email-otp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" autoFocus />
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
              {pending ? "Sending code…" : "Email me a code"}
            </Button>
            <button type="button" onClick={() => { setError(""); setMode("password"); }} className="w-full text-center text-[12.5px] text-muted hover:text-ink">
              Use a password instead
            </button>
          </form>
        )}

        {mode === "code-entry" && (
          <form onSubmit={verifyCode} className="mt-5 space-y-4">
            <p className="text-center text-[13px] text-ink-soft">
              Code sent to <span className="font-medium">{email}</span>
            </p>
            <Field label="6-digit code" htmlFor="code" error={error || undefined}>
              <Input
                id="code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="text-center font-mono text-[20px] tracking-[0.3em]"
              />
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
              {pending ? "Checking…" : "Sign in"}
            </Button>
            <button type="button" onClick={() => { setError(""); setMode("code"); }} className="w-full text-center text-[12.5px] text-muted hover:text-ink">
              Use a different email
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-[13px] text-muted">
          New to Nexire?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create a company account
          </Link>
        </p>
      </Card>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line-soft" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">or</span>
        <span className="h-px flex-1 bg-line-soft" />
      </div>

      {/* ------------------------------------------------------- demo — untouched path */}
      <Card className="overflow-hidden border-primary/25 bg-primary-soft/30 p-6 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary text-white">
          <Icon.Sparkle size={20} />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-ink">Just want to look around?</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Explore the full dashboard with realistic mock data — no signup, no credentials.
        </p>
        <Button href="/dashboard" variant="accent" size="lg" className="mt-5 w-full">
          Explore demo dashboard
          <Icon.ArrowRight size={16} />
        </Button>
      </Card>
    </AuthShell>
  );
}

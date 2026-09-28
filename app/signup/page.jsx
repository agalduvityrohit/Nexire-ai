"use client";

// Passwordless-first signup: enter your details, we email a 6-digit code,
// enter it to create the account, then set a password so future logins at
// /login are instant. Falls back cleanly to a straight password signup if
// email sign-in isn't configured on this deployment yet (see
// app/api/auth/otp/request/route.js).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/public/AuthShell";
import { Button, Card, Field, Input } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function SignupPage() {
  const router = useRouter();
  const { session, signOut, loadSession } = useStore();

  const [step, setStep] = useState("details"); // details | code | password | fallback-password
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // See app/login/page.jsx#goToDemo — same reasoning: /dashboard shows
  // whatever session cookie is present, so make sure there isn't one.
  async function goToDemo() {
    if (session?.real) await signOut();
    router.push("/dashboard");
  }

  async function requestCode(e) {
    e.preventDefault();
    setError("");
    if (companyName.trim().length < 2) return setError("Enter your company name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email.");

    setPending(true);
    const { ok, status, json } = await postJson("/api/auth/otp/request", { email: email.trim() });
    setPending(false);
    if (!ok) {
      if (status === 503) return setStep("fallback-password"); // email sign-in not set up yet on this deployment
      return setError(json.error || "Couldn't send the code.");
    }
    setStep("code");
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code.");

    setPending(true);
    const { ok, json } = await postJson("/api/auth/otp/verify", {
      email: email.trim(),
      code: code.trim(),
      companyName: companyName.trim(),
      name: name.trim(),
    });
    setPending(false);
    if (!ok) return setError(json.error || "That code isn't right.");

    await loadSession();
    setStep("password");
  }

  async function setAccountPassword(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");

    setPending(true);
    const { ok, json } = await postJson("/api/auth/set-password", { password });
    setPending(false);
    if (!ok) return setError(json.error || "Couldn't set your password.");
    router.push("/dashboard");
  }

  function skipPassword() {
    router.push("/dashboard");
  }

  async function resend() {
    setError("");
    const { ok, json } = await postJson("/api/auth/otp/request", { email: email.trim() });
    if (!ok) setError(json.error || "Couldn't resend the code.");
  }

  return (
    <AuthShell badge={null}>
      <Card className="p-6">
        {step === "details" && (
          <>
            <div className="text-center">
              <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Create your company account</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                No password to invent right now — we&apos;ll email you a code to confirm it&apos;s you.
              </p>
            </div>

            <form onSubmit={requestCode} className="mt-5 space-y-4" noValidate>
              <Field label="Company name" htmlFor="company" required error={error || undefined}>
                <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Northwind Labs" autoComplete="organization" />
              </Field>
              <Field label="Your name" htmlFor="name" hint="· optional">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Raghavan" autoComplete="name" />
              </Field>
              <Field label="Work email" htmlFor="email" required>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
              </Field>

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
                {pending ? "Sending code…" : "Email me a code"}
                {!pending && <Icon.ArrowRight size={16} />}
              </Button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <div className="text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon.Mail size={20} />
              </span>
              <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">Check your email</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                We sent a 6-digit code to <span className="font-medium text-ink-soft">{email}</span>. It expires in 10 minutes.
              </p>
            </div>

            <form onSubmit={verifyCode} className="mt-5 space-y-4" noValidate>
              <Field label="6-digit code" htmlFor="code" required error={error || undefined}>
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
                {pending ? "Checking…" : "Verify and continue"}
              </Button>
              <div className="flex items-center justify-between text-[12.5px]">
                <button type="button" onClick={() => setStep("details")} className="text-muted hover:text-ink">
                  Wrong email?
                </button>
                <button type="button" onClick={resend} className="font-medium text-primary hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          </>
        )}

        {step === "password" && (
          <>
            <div className="text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
                <Icon.Check size={20} />
              </span>
              <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">You&apos;re in — set a password</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Optional, but it means next time you can sign in directly instead of waiting for another email.
              </p>
            </div>

            <form onSubmit={setAccountPassword} className="mt-5 space-y-4" noValidate>
              <Field label="Password" htmlFor="password" required hint="· at least 8 characters" error={error || undefined}>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
              </Field>
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
                {pending ? "Saving…" : "Set password and continue"}
              </Button>
              <button type="button" onClick={skipPassword} className="w-full text-center text-[12.5px] font-medium text-muted hover:text-ink">
                Skip for now — I&apos;ll use email codes to sign in
              </button>
            </form>
          </>
        )}

        {step === "fallback-password" && <PasswordSignup companyName={companyName} name={name} email={email} onBack={() => setStep("details")} />}
      </Card>

      {step === "details" && (
        <>
          <p className="mt-5 text-center text-[13px] text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-5 text-center text-[12.5px] text-muted">
            Just browsing?{" "}
            <button type="button" onClick={goToDemo} className="font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline">
              Explore the demo dashboard
            </button>
          </p>
        </>
      )}
    </AuthShell>
  );
}

// Shown only if email sign-in isn't configured on this deployment yet (no
// Resend key set) — keeps signup possible so the first admin account can
// always be created, then set Resend up from /admin/keys for everyone after.
function PasswordSignup({ companyName, name, email, onBack }) {
  const router = useRouter();
  const { loadSession } = useStore();
  const [form, setForm] = useState({ companyName, name, email, password: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.companyName.trim().length < 2) return setError("Enter your company name.");
    if (!EMAIL_RE.test(form.email.trim())) return setError("Enter a valid email.");
    if (form.password.length < 8) return setError("Use at least 8 characters.");

    setPending(true);
    const { ok, json } = await postJson("/api/auth/signup", {
      companyName: form.companyName.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    setPending(false);
    if (!ok) return setError(json.error || "Couldn't create your account.");
    await loadSession();
    router.push("/dashboard");
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Create your account with a password</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">Email codes aren&apos;t set up on this deployment yet — use a password for now.</p>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field label="Company name" htmlFor="fb-company" required>
          <Input id="fb-company" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} autoComplete="organization" />
        </Field>
        <Field label="Your name" htmlFor="fb-name" hint="· optional">
          <Input id="fb-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
        </Field>
        <Field label="Work email" htmlFor="fb-email" required>
          <Input id="fb-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="fb-password" required hint="· at least 8 characters" error={error || undefined}>
          <Input id="fb-password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating your workspace…" : "Create account"}
        </Button>
        <button type="button" onClick={onBack} className="w-full text-center text-[12.5px] text-muted hover:text-ink">
          Back
        </button>
      </form>
    </>
  );
}

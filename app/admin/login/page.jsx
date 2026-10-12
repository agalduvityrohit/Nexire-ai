"use client";

// The founders' door. Not linked from anywhere on the public site. Only the emails in
// ADMIN_EMAILS can get through (checked on the server in /api/admin/login); anyone
// else sees the same "incorrect email or password" a wrong password would give.

import { useState } from "react";
import { Wordmark } from "@/components/public/TopNav";
import { Badge, Button, Card, Field, Input } from "@/components/ui/Primitives";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Couldn't sign in. Try again.");
        setPending(false);
        return;
      }
      window.location.assign("/admin"); // full navigation so the server sees the new session cookie
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div data-admin-theme className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Wordmark />
          <Badge tone="violet">Admin</Badge>
        </div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Founder sign-in</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">For Nexire administrators only.</p>
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label="Admin email" htmlFor="admin-email">
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            <Field label="Password" htmlFor="admin-password" error={error || undefined}>
              <Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-[12px] text-faint">Sign-in attempts to this page are logged.</p>
      </div>
    </div>
  );
}

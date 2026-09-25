"use client";

// Two coexisting paths: a real account (email + password → that company's own
// isolated dashboard) and the no-signup demo (a sandbox with nothing in it that
// belongs to anyone).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/public/AuthShell";
import { Badge, Button, Card, Field, Input } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { loadSession } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't sign you in.");
        setPending(false);
        return;
      }
      await loadSession();
      router.push(json.company?.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Network error — try again.");
      setPending(false);
    }
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

        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Work email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
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
        </form>

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

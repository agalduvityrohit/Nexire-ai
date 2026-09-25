"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/public/AuthShell";
import { Button, Card, Field, Input } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const { loadSession } = useStore();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState({});

  async function submit(e) {
    e.preventDefault();

    const next = {};
    if (companyName.trim().length < 2) next.companyName = "Enter your company name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = "Enter a valid email.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim(), name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({ form: json.error || "Couldn't create your account." });
        setPending(false);
        return;
      }
      await loadSession();
      router.push("/dashboard");
    } catch {
      setErrors({ form: "Network error — try again." });
      setPending(false);
    }
  }

  return (
    <AuthShell badge={null}>
      <Card className="p-6">
        <div className="text-center">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Create your company account</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            You get your own private workspace. Nobody else can see your jobs or candidates.
          </p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <Field label="Company name" htmlFor="company" required error={errors.companyName}>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Northwind Labs"
              autoComplete="organization"
            />
          </Field>
          <Field label="Your name" htmlFor="name" hint="· optional">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Raghavan" autoComplete="name" />
          </Field>
          <Field label="Work email" htmlFor="email" required error={errors.email}>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Password" htmlFor="password" required hint="· at least 8 characters" error={errors.password || errors.form}>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
            {pending ? "Creating your workspace…" : "Create account"}
            {!pending && <Icon.ArrowRight size={16} />}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>

      <p className="mt-5 text-center text-[12.5px] text-muted">
        Just browsing?{" "}
        <Link href="/dashboard" className="font-medium text-ink-soft hover:text-ink">
          Explore the demo dashboard
        </Link>
      </p>
    </AuthShell>
  );
}

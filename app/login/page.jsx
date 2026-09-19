"use client";

// Demo bypass + soft waitlist. There's no real auth (see lib/store.jsx#signIn's
// own comment: "There is no auth — this only drives the signed-in chrome"), so
// this screen is honest about it: the dashboard is one click away as a demo,
// and a real signup attempt is captured as a lead (app/api/waitlist/route.js)
// instead of silently faking an account or failing. No sign-in — there's
// nothing to sign in to yet.

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/public/TopNav";
import { Badge, Button, Card, Field, Input, MockNote, Select } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"];

export default function LoginPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          companyName: companyName.trim() || null,
          companySize: companySize || null,
          roleTitle: roleTitle.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong — try again.");
        setPending(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — try again.");
    }
    setPending(false);
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] dot-grid opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />

      <header className="flex items-center justify-between px-5 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <Wordmark />
          <Badge tone="warn" className="hidden sm:inline-flex">
            Prototype · mock data
          </Badge>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
          <Icon.ArrowLeft size={14} />
          Back to site
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px]"
        >
          <Badge tone="warn" className="mx-auto mb-4 flex w-fit sm:hidden">
            Prototype · mock data
          </Badge>

          {/* ------------------------------------------------------- demo — always the easiest path */}
          <Card className="overflow-hidden border-primary/25 bg-primary-soft/30 p-6 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary text-white">
              <Icon.Sparkle size={20} />
            </span>
            <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">Just want to look around?</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Explore the full dashboard with realistic mock data — no signup, no credentials.
            </p>
            <Button href="/dashboard" variant="accent" size="lg" className="mt-5 w-full">
              Explore demo dashboard
              <Icon.ArrowRight size={16} />
            </Button>
          </Card>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line-soft" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">or</span>
            <span className="h-px flex-1 bg-line-soft" />
          </div>

          {/* --------------------------------------------------- real form, secondary */}
          <Card className="p-6">
            {submitted ? (
              <div className="py-1 text-center">
                <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
                  <Icon.Check size={20} />
                </span>
                <h2 className="mt-4 text-[16px] font-semibold text-ink">You're on the list</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                  Thanks! We're onboarding companies individually right now — we'll be in touch soon. Feel
                  free to explore the live demo below in the meantime.
                </p>
                <Button href="/dashboard" variant="accent" size="lg" className="mt-5 w-full">
                  Explore demo dashboard
                  <Icon.ArrowRight size={16} />
                </Button>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
                >
                  Used the wrong details? Try again
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-[15px] font-semibold text-ink">Join the waitlist</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    We're onboarding companies individually — tell us a bit about your team and we'll reach
                    out.
                  </p>
                </div>

                <form onSubmit={submit} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your name" htmlFor="name" hint="· optional">
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Priya Raghavan"
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Role" htmlFor="role" hint="· optional">
                      <Input
                        id="role"
                        value={roleTitle}
                        onChange={(e) => setRoleTitle(e.target.value)}
                        placeholder="Head of Talent"
                        autoComplete="off"
                      />
                    </Field>
                  </div>

                  <Field label="Work email" htmlFor="email" required error={error || undefined}>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="you@company.com"
                      autoComplete="off"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company name" htmlFor="company" hint="· optional">
                      <Input
                        id="company"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Northwind Labs"
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Company size" htmlFor="company-size" hint="· optional">
                      <Select
                        id="company-size"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {COMPANY_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s} employees
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={pending}>
                    {pending ? "One moment…" : "Join the waitlist"}
                    {!pending && <Icon.ArrowRight size={16} />}
                  </Button>
                </form>

                <MockNote className="mt-5">
                  Prototype — no real accounts exist yet. Signups here join a waitlist instead.
                </MockNote>
              </>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

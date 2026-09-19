"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/public/TopNav";
import { Badge, Button, Card, MockNote } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { companies, companyRoles } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ROLE_ICONS = {
  recruiter: Icon.Users,
  "hiring-manager": Icon.Briefcase,
  interviewer: Icon.Mic,
  admin: Icon.Settings,
};

export default function JoinCompanyPage() {
  const router = useRouter();
  const { session, signIn, setSessionCompany, setSessionRole, notify } = useStore();

  const [query, setQuery] = useState("");
  const [company, setCompany] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
    );
  }, [query]);

  function finish() {
    if (!company) {
      setError("Pick the company you're joining.");
      return;
    }
    if (!role) {
      setError("Pick the role that best describes what you do.");
      return;
    }
    // Deep-linking here without signing in first is fine — create the session now.
    if (!session) signIn({ company, companyRole: role });
    else {
      setSessionCompany(company);
      setSessionRole(role);
    }
    notify(`You're set up as ${role.label} at ${company.name}`);
    router.push("/dashboard");
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] dot-grid opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />

      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-10">
        <Wordmark />
        <Link href="/login" className="flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
          <Icon.ArrowLeft size={14} />
          Back to login
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-5 pb-20 sm:px-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-[27px] font-semibold tracking-[-0.03em] text-ink sm:text-[30px]">
              Join your company
            </h1>
            <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-muted">
              Pick the company you&apos;re hiring for and the role you play on it. You can change both later
              in settings.
            </p>
          </motion.div>

          {/* ------------------------------------------------------- company */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold text-ink">Your company</h2>
              {company && <span className="text-[12px] text-primary">{company.name} selected</span>}
            </div>

            <Card className="mt-2.5 overflow-hidden">
              <div className="border-b border-line p-3">
                <label className="relative flex items-center">
                  <Icon.Search size={16} className="pointer-events-none absolute left-3 text-faint" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setError("");
                    }}
                    placeholder="Search by name or industry…"
                    className="h-11 w-full rounded-[10px] border border-line bg-surface pl-10 pr-3 text-[14px] text-ink placeholder:text-faint outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </div>

              <ul className="max-h-[268px] divide-y divide-line-soft overflow-y-auto thin-scrollbar">
                {results.map((c) => {
                  const active = company?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCompany(c);
                          setError("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          active ? "bg-primary-soft/60" : "hover:bg-raised"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold ring-1 ring-inset",
                            active ? "bg-primary text-white ring-primary" : "bg-canvas-deep text-ink-soft ring-line"
                          )}
                        >
                          {c.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-medium text-ink">{c.name}</span>
                            {c.verified && <Icon.Check size={13} className="shrink-0 text-primary" />}
                          </span>
                          <span className="block truncate text-[12px] text-muted">
                            {c.industry} · {c.size} · {c.location}
                          </span>
                        </span>
                        {active ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                            <Icon.Check size={12} />
                          </span>
                        ) : (
                          <Badge tone="neutral">{c.openRoles} roles</Badge>
                        )}
                      </button>
                    </li>
                  );
                })}

                {!results.length && (
                  <li className="px-4 py-10 text-center">
                    <p className="text-[13.5px] font-medium text-ink">No company matches “{query}”</p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      Setting up a new one instead?{" "}
                      <Link href="/login" className="text-primary hover:underline">
                        Create a workspace
                      </Link>
                    </p>
                  </li>
                )}
              </ul>
            </Card>
          </motion.div>

          {/* ---------------------------------------------------------- role */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7"
          >
            <h2 className="text-[13px] font-semibold text-ink">Your role</h2>

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {companyRoles.map((r) => {
                const Glyph = ROLE_ICONS[r.id] || Icon.Users;
                const active = role?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setError("");
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex h-full flex-col rounded-card border bg-surface p-4 text-left shadow-card transition-all duration-200",
                      active
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-line hover:scale-[1.02] hover:border-line-strong hover:shadow-lift"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-[10px] transition-colors",
                          active ? "bg-primary text-white" : "bg-canvas-deep text-primary"
                        )}
                      >
                        <Glyph size={17} />
                      </span>
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border transition-colors",
                          active ? "border-primary bg-primary text-white" : "border-line-strong"
                        )}
                      >
                        {active && <Icon.Check size={11} />}
                      </span>
                    </div>
                    <h3 className="mt-3.5 text-[14px] font-semibold tracking-[-0.015em] text-ink">{r.label}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{r.summary}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {error && <p className="mt-4 text-[12.5px] text-danger">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button href="/login" variant="ghost" size="md">
              <Icon.ArrowLeft size={15} />
              Back
            </Button>
            <Button variant="primary" size="md" onClick={finish}>
              Go to dashboard
              <Icon.ArrowRight size={15} />
            </Button>
          </div>

          <MockNote className="mt-6">
            Prototype — permissions are not enforced. Every role lands on the same dashboard, and nothing is
            saved.
          </MockNote>
        </div>
      </main>
    </div>
  );
}

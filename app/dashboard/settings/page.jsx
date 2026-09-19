"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/Shell";
import { ApiConnections } from "@/components/dashboard/ApiConnections";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Field,
  Input,
  MockNote,
  Pill,
  SectionTitle,
  Select,
  Textarea,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { employer } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "workspace", label: "Workspace", icon: Icon.Settings },
  { id: "team", label: "Team", icon: Icon.Users },
  { id: "screening", label: "Screening & AI", icon: Icon.Sparkle },
  { id: "connections", label: "API Connections", icon: Icon.Link },
  { id: "sources", label: "Sources", icon: Icon.Inbox },
  { id: "notifications", label: "Notifications", icon: Icon.Bell },
  { id: "billing", label: "Plan & billing", icon: Icon.Doc },
];

const TEAM = [
  { name: "Priya Raghavan", email: "priya@northwindlabs.com", role: "Owner", initials: "PR" },
  { name: "Kiran Shetty", email: "kiran@northwindlabs.com", role: "Hiring manager", initials: "KS" },
  { name: "Anil Bose", email: "anil@northwindlabs.com", role: "Interviewer", initials: "AB" },
  { name: "Leah Mathew", email: "leah@northwindlabs.com", role: "Recruiter", initials: "LM" },
];

const SOURCES = [
  { name: "Careers page", detail: "northwindlabs.com/careers", state: "Connected", tone: "success" },
  { name: "Inbox forwarding", detail: "jobs@northwindlabs.com", state: "Connected", tone: "success" },
  { name: "LinkedIn", detail: "Recruiter seat · 2 sync errors", state: "Attention", tone: "warn" },
  { name: "Wellfound", detail: "Company profile linked", state: "Connected", tone: "success" },
  { name: "Naukri", detail: "Not connected", state: "Off", tone: "neutral" },
  { name: "Greenhouse export", detail: "Not connected", state: "Off", tone: "neutral" },
];

export default function SettingsPage() {
  const { notify } = useStore();
  const [section, setSection] = useState("workspace");

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Workspace, team, and how the screening layer behaves. Nothing here persists in the prototype."
        actions={
          <Button variant="primary" size="sm" onClick={() => notify("Settings saved")}>
            Save changes
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[210px_1fr]">
        <nav className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => {
              const Glyph = s.icon;
              const active = section === s.id;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors",
                      active ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:bg-surface/70 hover:text-ink"
                    )}
                  >
                    <Glyph size={15} className={active ? "text-primary" : "text-faint"} />
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="min-w-0"
        >
          {section === "workspace" && <WorkspaceSection />}
          {section === "team" && <TeamSection />}
          {section === "screening" && <ScreeningSection />}
          {section === "connections" && <ApiConnections />}
          {section === "sources" && <SourcesSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "billing" && <BillingSection />}
        </motion.div>
      </div>
    </>
  );
}

function WorkspaceSection() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle eyebrow="Organisation" title="Workspace details" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="company">
            <Input id="company" defaultValue={employer.company} />
          </Field>
          <Field label="Careers page slug" htmlFor="slug">
            <Input id="slug" defaultValue="northwindlabs" />
          </Field>
          <Field label="Primary location" htmlFor="loc">
            <Input id="loc" defaultValue="Bengaluru, India" />
          </Field>
          <Field label="Default timezone" htmlFor="tz">
            <Select id="tz" defaultValue="Asia/Kolkata">
              <option>Asia/Kolkata</option>
              <option>Asia/Singapore</option>
              <option>Europe/London</option>
              <option>America/New_York</option>
            </Select>
          </Field>
        </div>
        <Field label="Company blurb" htmlFor="blurb" className="mt-4" hint="· shown on every public job page">
          <Textarea
            id="blurb"
            rows={4}
            defaultValue="Northwind Labs builds payments infrastructure for Indian marketplaces. Forty people, profitable, and deliberately small."
          />
        </Field>
      </Card>

      <Card className="p-5">
        <SectionTitle eyebrow="Your account" title="Profile" />
        <div className="mt-5 flex items-center gap-4">
          <Avatar name={employer.name} initials={employer.initials} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium text-ink">{employer.name}</div>
            <div className="truncate text-[12.5px] text-muted">
              {employer.role} · {employer.email}
            </div>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0">
            Change photo
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TeamSection() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Access</div>
          <h2 className="mt-1 text-[15px] font-semibold text-ink">Team members</h2>
        </div>
        <Button variant="primary" size="sm">
          <Icon.Plus size={14} />
          Invite
        </Button>
      </div>
      <ul className="divide-y divide-line-soft">
        {TEAM.map((m) => (
          <li key={m.email} className="flex items-center gap-3 px-5 py-3.5">
            <Avatar name={m.name} initials={m.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-ink">{m.name}</div>
              <div className="truncate text-[12px] text-muted">{m.email}</div>
            </div>
            <Badge tone={m.role === "Owner" ? "primary" : "neutral"}>{m.role}</Badge>
            <button
              type="button"
              aria-label={`Manage ${m.name}`}
              className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-canvas-deep hover:text-ink"
            >
              <Icon.Dots size={15} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ScreeningSection() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle eyebrow="Behaviour" title="How screening runs" />
        <div className="mt-5 space-y-2.5">
          <Checkbox
            defaultChecked
            label="Auto-invite candidates above the match threshold"
            description="Applicants scoring above the threshold get an interview link within an hour."
          />
          <Checkbox
            defaultChecked
            label="Blind the model to identity fields"
            description="Name, photo, age, and gender are withheld from the scoring pass."
          />
          <Checkbox
            defaultChecked
            label="Require consent before recording"
            description="Candidates must actively accept before the microphone is enabled."
          />
          <Checkbox label="Allow candidates to retake an interview once" description="Useful when connection quality was poor." />
        </div>

        <Divider className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Auto-invite threshold" htmlFor="threshold" hint="· résumé match score">
            <Select id="threshold" defaultValue="60%">
              <option>50%</option>
              <option>60%</option>
              <option>70%</option>
              <option>80%</option>
            </Select>
          </Field>
          <Field label="Interview length target" htmlFor="len">
            <Select id="len" defaultValue="25 minutes">
              <option>15 minutes</option>
              <option>25 minutes</option>
              <option>40 minutes</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle eyebrow="Retention" title="Candidate data" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Keep transcripts for" htmlFor="ret">
            <Select id="ret" defaultValue="12 months">
              <option>3 months</option>
              <option>6 months</option>
              <option>12 months</option>
              <option>24 months</option>
            </Select>
          </Field>
          <Field label="Keep audio for" htmlFor="aud">
            <Select id="aud" defaultValue="90 days">
              <option>30 days</option>
              <option>90 days</option>
              <option>Do not keep audio</option>
            </Select>
          </Field>
        </div>
        <MockNote className="mt-4">
          Retention windows are shown to candidates verbatim on the consent screen.
        </MockNote>
      </Card>
    </div>
  );
}

function SourcesSection() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Inbound</div>
        <h2 className="mt-1 text-[15px] font-semibold text-ink">Where applications come from</h2>
      </div>
      <ul className="divide-y divide-line-soft">
        {SOURCES.map((s) => (
          <li key={s.name} className="flex items-center gap-3 px-5 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-line bg-canvas text-faint">
              <Icon.Inbox size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-ink">{s.name}</div>
              <div className="truncate text-[12px] text-muted">{s.detail}</div>
            </div>
            <Badge tone={s.tone} dot={s.tone !== "neutral"}>
              {s.state}
            </Badge>
            <Button variant="secondary" size="xs">
              {s.state === "Off" ? "Connect" : "Manage"}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NotificationsSection() {
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Alerts" title="What reaches you" />
      <div className="mt-5 space-y-2.5">
        <Checkbox defaultChecked label="Daily digest of new applications" description="One email at 8:00 AM with everything that came in." />
        <Checkbox defaultChecked label="Interview report ready" description="Sent as soon as a report finishes generating." />
        <Checkbox defaultChecked label="High-match candidate applied" description="Immediate alert for anyone scoring above 85%." />
        <Checkbox label="Weekly pipeline summary" description="Stage movement and time-in-stage across every open role." />
        <Checkbox label="Candidate declined AI interview" description="Routes to you for a manual screen." />
      </div>
      <Divider className="my-5" />
      <Field label="Send alerts to" htmlFor="alerts">
        <Input id="alerts" defaultValue={employer.email} />
      </Field>
    </Card>
  );
}

function BillingSection() {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="relative bg-primary-deep px-6 py-8 text-white">
          <div aria-hidden className="absolute inset-0 grid-lines opacity-30 mix-blend-overlay" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/50">Current plan</div>
              <div className="mt-1 text-[26px] font-semibold tracking-[-0.03em]">{employer.plan}</div>
              <div className="mt-1 text-[13px] text-white/60">Up to 10 open roles · unlimited AI interviews</div>
            </div>
            <div className="text-right">
              <div className="text-[26px] font-semibold tracking-[-0.03em]">₹24,000</div>
              <div className="text-[12.5px] text-white/60">per month · renews 12 Aug 2026</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {[
            ["Open roles", "3 of 10"],
            ["Interviews this month", "41"],
            ["Seats", "4 of 8"],
            ["Storage", "2.1 GB"],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted">{k}</div>
              <div className="mt-1 text-[14px] font-semibold text-ink">{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle eyebrow="History" title="Recent invoices" />
        <ul className="mt-4 divide-y divide-line-soft">
          {[
            ["Jul 2026", "₹24,000", "Paid"],
            ["Jun 2026", "₹24,000", "Paid"],
            ["May 2026", "₹18,000", "Paid"],
          ].map(([m, amt, state]) => (
            <li key={m} className="flex items-center gap-3 py-3">
              <Icon.Doc size={15} className="text-faint" />
              <span className="flex-1 text-[13px] text-ink">{m}</span>
              <span className="text-[13px] tabular-nums text-ink-soft">{amt}</span>
              <Pill>{state}</Pill>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

"use client";

// Candidate sourcing — every way to find candidates, as tabs:
//   Upload — bulk résumé upload (PDF/DOCX/TXT), parsed and auto-classified
//            by role; role-agnostic, no picker needed up front
//   GitHub — real search against GitHub's public API
//   Mail   — connect a mailbox and pull résumés out of it; role-agnostic too
//   Search — fictional multi-site search (LinkedIn, Indeed, Naukri, Wellfound,
//            Stack Overflow); layout/ranking design ahead of real connectors
// Upload used to be its own top-level sidebar page; merged in here as the
// first tab since it's just another way of sourcing candidates, same as the
// others — GitHub and Search need a role picked first (results are ranked
// against it), Upload and Mail don't (they ingest first, classify after).

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/Shell";
import { ConnectionStatusBanner } from "@/components/dashboard/ConnectionStatusBanner";
import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { SourcingSearchPanel } from "@/components/dashboard/SourcingSearchPanel";
import { GithubSourcingPanel } from "@/components/dashboard/GithubSourcingPanel";
import { MailImportPanel } from "@/components/dashboard/MailImportPanel";
import { Icon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "upload", label: "Upload", icon: Icon.Upload },
  { id: "github", label: "GitHub", icon: Icon.Github },
  { id: "mail", label: "Mail", icon: Icon.Mail },
  { id: "search", label: "Search", icon: Icon.Search },
];

export default function SourcingPage() {
  const [tab, setTab] = useState("upload");

  return (
    <>
      <PageHeader
        eyebrow="Sourcing"
        title="Candidate sourcing"
        subtitle="Every way to find candidates — upload résumés in bulk, search talent sources, look up real GitHub activity, or pull résumés out of a connected mailbox."
      />

      {/* tabs */}
      <div className="mb-5 flex items-center gap-1 border-b border-line">
        {TABS.map((t) => {
          const Glyph = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink-soft"
              )}
            >
              <Glyph size={15} className={active ? "text-primary" : "text-faint"} />
              {t.label}
              {active && (
                <motion.span
                  layoutId="sourcing-tab-underline"
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === "upload" && <UploadPanel />}
      {tab === "search" && <SourcingSearchPanel />}
      {tab === "github" && (
        <>
          <ConnectionStatusBanner provider="github" label="GitHub" note="searching unauthenticated — lower rate limit" />
          <GithubSourcingPanel />
        </>
      )}
      {tab === "mail" && (
        <>
          <ConnectionStatusBanner provider="gmail" label="Mail" />
          <MailImportPanel />
        </>
      )}
    </>
  );
}

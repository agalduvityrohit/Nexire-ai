"use client";

// Reaching candidates already in the pipeline, as tabs:
//   Email — what's been sent, opened, and replied to
//   Calls — phone follow-up tracking
// Mail intake (connecting a mailbox, pulling résumés in) lives under
// Candidate sourcing instead — that's finding candidates, not reaching ones
// you already have, so it doesn't belong here even though both involve mail.

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/Shell";
import { ConnectionStatusBanner } from "@/components/dashboard/ConnectionStatusBanner";
import { EmailOutreachPanel } from "@/components/dashboard/EmailOutreachPanel";
import { CallOutreachPanel } from "@/components/dashboard/CallOutreachPanel";
import { Icon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "email", label: "Email", icon: Icon.Mail },
  { id: "calls", label: "Calls", icon: Icon.Phone },
];

export default function OutreachPage() {
  const [tab, setTab] = useState("email");

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Outreach"
        subtitle="Where every candidate stands after you've reached out — by email or by phone."
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
                  layoutId="outreach-tab-underline"
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === "email" && (
        <>
          <ConnectionStatusBanner provider="gmail" label="Mail" />
          <EmailOutreachPanel />
        </>
      )}
      {tab === "calls" && (
        <>
          <ConnectionStatusBanner label="Calling" note="no calling provider set up yet" />
          <CallOutreachPanel />
        </>
      )}
    </>
  );
}

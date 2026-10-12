"use client";

import { PageHeader } from "@/components/dashboard/Shell";
import { ApiConnections } from "@/components/dashboard/ApiConnections";
import { Card } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";

export default function AdminKeysPage() {
  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="API keys"
        subtitle="These power every company's dashboard. Companies run on them silently and never see or edit them. Changes apply immediately — no redeploy."
      />
      <div className="max-w-3xl space-y-4">
        <ApiConnections mode="admin" />
        <Card className="flex items-start gap-2.5 border-dashed p-4">
          <Icon.Mail size={15} className="mt-0.5 shrink-0 text-primary/70" />
          <p className="text-[12px] leading-relaxed text-muted">
            <span className="font-medium text-ink-soft">Email sender.</span> Resend only delivers to real candidates from a
            domain you&apos;ve verified. Set <code className="font-mono">EMAIL_FROM</code> (for example{" "}
            <code className="font-mono">Nexire &lt;hiring@yourdomain.com&gt;</code>) in your Vercel environment variables. Until then
            it uses Resend&apos;s test sender, which only reaches your own Resend account.
          </p>
        </Card>
      </div>
    </>
  );
}

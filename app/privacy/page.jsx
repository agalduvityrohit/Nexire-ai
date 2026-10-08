import { PublicFooter, TopNav } from "@/components/public/TopNav";

export const metadata = {
  title: "Privacy — Nexire AI",
  description: "What Nexire logs when you visit the site or use the product, why, and for how long.",
};

function H2({ children }) {
  return <h2 className="mt-10 text-[19px] font-semibold tracking-[-0.02em] text-ink">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-32 text-[15px] leading-relaxed text-ink-soft sm:px-8">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-ink">Privacy</h1>
        <p className="mt-3 text-muted">
          This page covers the usage logs Nexire keeps about the website and the product. It does not cover candidate
          résumés or interview data, which companies process through Nexire for their own hiring.
        </p>

        <H2>What we log</H2>
        <p className="mt-3">
          <strong className="font-semibold text-ink">Anonymous page views.</strong> When you visit a page we record the
          page, the date and time, your approximate city and country (from your network, not your device), your browser and
          operating system, and a <em>hashed</em> version of your IP address. We never store the IP address itself. The hash
          is mixed with a secret and the date, so it changes every day and can&apos;t be used to follow you from one day to
          the next. We don&apos;t set cookies for this, and we skip visitors whose browser sends Do Not Track or Global
          Privacy Control.
        </p>
        <p className="mt-3">
          <strong className="font-semibold text-ink">Account and usage events.</strong> If you have a company account we
          record when you sign up, log in (and from which browser and operating system), and when you post a job, add
          résumés, shortlist a candidate or send interview invitations — with the account it belongs to. We record counts,
          not content: no candidate names, résumé text or job descriptions go into these logs.
        </p>
        <p className="mt-3">
          <strong className="font-semibold text-ink">Failed logins.</strong> We keep the time, the network hash, and a
          partly masked email address (for example <span className="font-mono text-[13px]">ab***@example.com</span>). We never
          store the password or code that was entered.
        </p>
        <p className="mt-3">
          We also use Vercel Web Analytics for aggregated page-view statistics on the public site.
        </p>

        <H2>Why</H2>
        <p className="mt-3">To understand how Nexire is used so we can improve it, and to notice suspicious sign-in activity so we can protect accounts.</p>

        <H2>How long</H2>
        <p className="mt-3">Logs are deleted automatically after 90 days.</p>

        <H2>Who can see it</H2>
        <p className="mt-3">Only the Nexire founders, through an access-restricted console. The log is not readable from the website or by other companies.</p>

        <H2>Deleting your logs</H2>
        <p className="mt-3">
          Ask the Nexire team that onboarded you and we&apos;ll delete every logged event tied to your account. Anonymous page
          views can&apos;t be linked back to a person, so they can&apos;t be looked up individually; they expire with the rest.
        </p>
      </main>
      <PublicFooter />
    </>
  );
}

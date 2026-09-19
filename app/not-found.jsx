import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">404</span>
      <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">This screen doesn&apos;t exist yet</h1>
      <p className="max-w-sm text-[14px] leading-relaxed text-muted">
        The prototype covers three things right now: the landing page, the login flow, and the employer
        dashboard.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="rounded-[10px] bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Landing page
        </Link>
        <Link
          href="/dashboard"
          className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas-deep"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

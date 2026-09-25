"use client";

// Founder/admin area. The page-level redirect below is a courtesy — the real
// gate is the server: every /api/admin/* route and the platform-key routes
// re-check the admin role against the database.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Wordmark } from "@/components/public/TopNav";
import { Badge } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Companies", exact: true },
  { href: "/admin/keys", label: "API keys" },
];

export default function AdminLayout({ children }) {
  const { session, authReady, signOut } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = session?.accountRole === "admin";

  useEffect(() => {
    if (authReady && !isAdmin) router.replace(session?.real ? "/dashboard" : "/login");
  }, [authReady, isAdmin, session, router]);

  if (!authReady || !isAdmin) {
    return <div className="grid min-h-dvh place-items-center text-[13px] text-muted">Checking access…</div>;
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Wordmark />
          <Badge tone="violet">Admin</Badge>
          <nav className="ml-2 flex items-center gap-1">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.href || pathname.startsWith("/admin/companies") : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[13px]">
            <Link href="/dashboard" className="text-muted transition-colors hover:text-ink">
              My dashboard
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="text-muted transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</main>
    </div>
  );
}

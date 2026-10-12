"use client";

// Chrome for every /admin page. By the time this renders, the server layout
// (app/admin/(console)/layout.jsx) has already proven the visitor is an allow-listed admin —
// anyone else got a 404 before reaching here — so there is no client-side gate.
//
// data-admin-theme switches the colour tokens to a dark palette when the OS asks for
// one (see app/globals.css). It's scoped to /admin on purpose; the public site and
// the company dashboard stay light.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/public/TopNav";
import { Badge } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Console", match: (p) => p === "/admin" || p.startsWith("/admin/companies") },
  { href: "/admin/keys", label: "API keys", match: (p) => p.startsWith("/admin/keys") },
];

export function AdminShell({ children }) {
  const { signOut } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div data-admin-theme className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <Wordmark />
          <Badge tone="violet">Admin</Badge>
          {/* On a phone the section links drop to their own scrollable row instead of overflowing the page. */}
          <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:ml-2 sm:w-auto sm:pb-0" aria-label="Admin sections">
            {TABS.map((t) => {
              const active = t.match(pathname);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[13px]">
            <Link href="/dashboard" className="hidden text-muted transition-colors hover:text-ink sm:inline">
              My dashboard
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/admin/login");
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

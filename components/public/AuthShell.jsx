"use client";

// Shared frame for /login and /signup: wordmark header, back link, centered card column.

import Link from "next/link";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/public/TopNav";
import { Badge } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";

export function AuthShell({ children, badge = "Prototype · mock data" }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] dot-grid opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />

      <header className="flex items-center justify-between px-5 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <Wordmark />
          {badge && (
            <Badge tone="warn" className="hidden sm:inline-flex">
              {badge}
            </Badge>
          )}
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
          {children}
        </motion.div>
      </main>
    </div>
  );
}

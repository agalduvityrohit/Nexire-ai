"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui/Icons";

const TONES = {
  success: { ring: "bg-success-soft text-success", icon: Icon.Check },
  info: { ring: "bg-info-soft text-info", icon: Icon.Sparkle },
  warn: { ring: "bg-warn-soft text-warn", icon: Icon.Warning },
};

export function Toaster() {
  const { toast } = useStore();
  const tone = TONES[toast?.tone] || TONES.success;
  const Glyph = tone.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex justify-center px-4 sm:bottom-7">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-surface/95 py-2 pl-2 pr-5 shadow-pop backdrop-blur"
          >
            <span className={`flex size-7 items-center justify-center rounded-full ${tone.ring}`}>
              <Glyph size={15} />
            </span>
            <span className="text-[13px] font-medium text-ink">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

// Scroll reveals. Fire once, settle, never re-trigger.
// All timing comes from lib/motion.js so the page keeps one motion personality.

import { motion, useReducedMotion } from "framer-motion";
import { DURATION, RISE, STAGGER, transition, VIEWPORT } from "@/lib/motion";

export function Reveal({ children, delay = 0, y = RISE, className, as = "div" }) {
  const reduced = useReducedMotion();
  const Comp = motion[as] || motion.div;

  return (
    <Comp
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={transition(reduced ? DURATION.quick : DURATION.base, delay)}
      className={className}
    >
      {children}
    </Comp>
  );
}

export function Stagger({ children, className, delay = 0, stagger = STAGGER }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : RISE },
        show: { opacity: 1, y: 0, transition: transition(reduced ? DURATION.quick : DURATION.base) },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

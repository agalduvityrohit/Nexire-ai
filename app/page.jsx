"use client";

import { motion } from "framer-motion";
import { PublicFooter, TopNav } from "@/components/public/TopNav";
import { HeroVisual } from "@/components/public/HeroVisual";
import { Reveal, Stagger, StaggerItem } from "@/components/public/Reveal";
import { ProductTour } from "@/components/landing/ProductTour";
import { FeatureExplorer } from "@/components/landing/FeatureExplorer";
import {
  InterviewSection,
  MatchExplainer,
  OutreachSection,
  SourcesSection,
} from "@/components/landing/Sections";
import {
  CoreFeaturesSection,
  HowItWorksSection,
  ProblemSection,
  SolutionSection,
  TrustStrip,
} from "@/components/landing/Explainer";
import { Badge, Button } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { marketing } from "@/lib/mock-data";
import { EASE } from "@/lib/motion";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <TopNav />
      <main>
        <Hero />
        <Metrics />

        {/* the argument: problem → solution → how → see it */}
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <TourSection />

        {/* what you get, then why you can trust it */}
        <CoreFeaturesSection />
        <TrustStrip />
        <InterviewSection />

        {/* deeper dives on the two hardest claims */}
        <MatchExplainer />
        <SourcesSection />
        <OutreachSection />

        {/* proof and close */}
        <FeatureSection />
        <Cta />
      </main>
      <PublicFooter />
    </div>
  );
}

/* ------------------------------------------------------------------- Hero  */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[560px] dot-grid opacity-[0.55] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(221,99,56,0.10),transparent)]" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-12">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-[12px] font-medium text-ink-soft shadow-xs backdrop-blur">
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-white">
                  New
                </span>
                We read public code, not just your inbox
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.06, ease: EASE }}
              className="mt-6 text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[56px]"
            >
              Hiring, without the
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">résumé pile</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1.5 -z-0 h-3 rounded-sm bg-accent/18 sm:bottom-2 sm:h-4"
                />
              </span>
              .
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft sm:text-[18px]"
            >
              Nexire reads every applicant in full, sits the promising ones down with a lifelike AI
              interviewer, and hands you a short list with the evidence attached. You read nine reports
              instead of four hundred résumés.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button href="/login" variant="accent" size="lg">
                Get started
                <Icon.ArrowRight size={17} />
              </Button>
              <Button as="a" href="#tour" variant="secondary" size="lg">
                <Icon.Play size={15} />
                See how it works
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted"
            >
              {["No credit card", "Live in an afternoon", "You make every decision"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Icon.Check size={14} className="text-primary" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Metrics */

function Metrics() {
  return (
    <section className="border-y border-line bg-canvas-deep/40">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Stagger className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {marketing.metrics.map((m) => (
            <StaggerItem key={m.label}>
              <div className="text-[28px] font-semibold leading-none tracking-[-0.035em] text-ink sm:text-[32px]">
                {m.value}
              </div>
              <div className="mt-2 text-[12.5px] leading-relaxed text-muted">{m.label}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- Tour */

function TourSection() {
  return (
    <section id="tour" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="accent">Product tour</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            What actually happens, step by step.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Six steps from a job description to a decision. Click through them, or let it run.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <ProductTour />
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Features */

function FeatureSection() {
  return (
    <section id="feature-detail" className="scroll-mt-24 border-t border-line bg-canvas-deep/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="neutral">Go deeper</Badge>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
            The same features, in full detail.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Pick an area and open anything you want to understand properly.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <FeatureExplorer />
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- CTA */

function Cta() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-panel bg-primary-deep px-6 py-14 text-center sm:px-12 sm:py-20">
            <div aria-hidden className="absolute inset-0 grid-lines opacity-30 mix-blend-overlay" />
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(221,99,56,0.35),transparent)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-[30px] font-semibold leading-[1.1] tracking-[-0.032em] text-white sm:text-[40px]">
                Your next role, screened by tomorrow morning.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-white/60">
                Post the job, connect your inbox, and let the first pass run overnight.
              </p>
              <div className="mt-9">
                <Button href="/login" variant="accent" size="lg" className="shadow-lift">
                  Get started
                  <Icon.ArrowRight size={17} />
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

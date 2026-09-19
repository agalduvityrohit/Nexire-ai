"use client";

// Evidence-based report sections — shared by the single-candidate Debrief
// report page and the Compare view (rendered once per column there). No bare
// scores or emotion metrics anywhere on purpose: every claim is backed by a
// paraphrased line from the interview transcript, not a number.

import { Badge, Card, SectionTitle } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

function EvidenceBlock({ title, assessment, evidence, size }) {
  return (
    <div>
      <h3 className={cn("font-semibold text-ink", size === "sm" ? "text-[12.5px]" : "text-[13.5px]")}>{title}</h3>
      <p className={cn("mt-1.5 leading-relaxed text-ink-soft", size === "sm" ? "text-[12px]" : "text-[13px]")}>
        {assessment}
      </p>
      {evidence?.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {evidence.map((line, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-[8px] border border-line-soft bg-canvas-deep/30 px-2.5 py-2 leading-relaxed text-ink-soft",
                size === "sm" ? "text-[11.5px]" : "text-[12.5px]"
              )}
            >
              <Icon.Sparkle size={size === "sm" ? 10 : 11} className="mt-0.5 shrink-0 text-primary/60" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PointList({ title, tone, icon: Glyph, points, size }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={cn("font-semibold text-ink", size === "sm" ? "text-[12.5px]" : "text-[13.5px]")}>{title}</span>
        <Badge tone={tone}>{points.length}</Badge>
      </div>
      <ul className="mt-2.5 space-y-2">
        {points.map((p) => (
          <li
            key={p.title}
            className={cn(
              "rounded-[9px] border px-3 py-2.5",
              tone === "success" ? "border-success/18 bg-success-soft/40" : "border-warn/18 bg-warn-soft/35"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  tone === "success" ? "bg-success/12 text-success" : "bg-warn/12 text-warn"
                )}
              >
                <Glyph size={9} />
              </span>
              <span className={cn("font-medium text-ink", size === "sm" ? "text-[12px]" : "text-[12.5px]")}>
                {p.title}
              </span>
            </div>
            <p className={cn("mt-1.5 pl-5.5 leading-relaxed text-ink-soft", size === "sm" ? "text-[11.5px]" : "text-[12.5px]")}>
              {p.evidence}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{report: object, size?: "sm"|"md", asCards?: boolean}} props
 * `asCards` wraps each section in its own Card (single-report view);
 * without it, sections render bare and stacked (compare-view columns).
 */
export function DebriefReportSections({ report, size = "md", asCards = true }) {
  const Wrap = asCards ? Card : "div";
  const wrapProps = asCards ? { className: "p-5" } : { className: "space-y-5" };

  if (asCards) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <SectionTitle eyebrow="Assessment" title="Technical depth" />
          <div className="mt-4">
            <EvidenceBlock assessment={report.technicalDepth.assessment} evidence={report.technicalDepth.evidence} size={size} title="" />
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle eyebrow="Assessment" title="Communication clarity" />
          <div className="mt-4">
            <EvidenceBlock assessment={report.communicationClarity.assessment} evidence={report.communicationClarity.evidence} size={size} title="" />
          </div>
        </Card>
        <Card className="p-5">
          <PointList title="Strengths" tone="success" icon={Icon.Check} points={report.strengths} size={size} />
        </Card>
        <Card className="p-5">
          <PointList title="Gaps and risks" tone="warn" icon={Icon.Warning} points={report.gaps} size={size} />
        </Card>
        <Card className="p-5">
          <SectionTitle eyebrow="Decide" title="Recommended next steps" />
          <ul className="mt-3 space-y-2">
            {report.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50" />
                {step}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div {...wrapProps}>
      <EvidenceBlock title="Technical depth" assessment={report.technicalDepth.assessment} evidence={report.technicalDepth.evidence} size={size} />
      <EvidenceBlock title="Communication clarity" assessment={report.communicationClarity.assessment} evidence={report.communicationClarity.evidence} size={size} />
      <PointList title="Strengths" tone="success" icon={Icon.Check} points={report.strengths} size={size} />
      <PointList title="Gaps and risks" tone="warn" icon={Icon.Warning} points={report.gaps} size={size} />
      <div>
        <span className={cn("font-semibold text-ink", size === "sm" ? "text-[12.5px]" : "text-[13.5px]")}>
          Recommended next steps
        </span>
        <ul className="mt-2 space-y-1.5">
          {report.nextSteps.map((step, i) => (
            <li key={i} className={cn("flex items-start gap-2 leading-relaxed text-ink-soft", size === "sm" ? "text-[11.5px]" : "text-[12.5px]")}>
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/50" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

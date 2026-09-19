// Debrief tab data — candidates who have completed the AI interview, with
// evidence-based reports. STRUCTURAL / MOCK: the AI Interviewer engine isn't
// built yet (see app/dashboard/interviews/page.jsx), so there are no real
// transcripts or reports to read from. This is written in the exact shape a
// real report would take, so wiring a real interview engine later is a data
// swap, not a redesign.
//
// `role` values are lib/roles.js#ROLE_LABELS — the same fixed list résumé
// parsing classifies candidates into — so lib/roleJobMatch.js#matchJobForRole
// can bucket each mock candidate under one of the company's real open jobs
// the same way an uploaded résumé would be.

export const DEBRIEF_STATUS_META = {
  report_ready: { label: "Report Ready", tone: "info" },
  hr_reviewing: { label: "HR Reviewing", tone: "violet" },
  final_scheduled: { label: "Final Round Scheduled", tone: "primary" },
  hired: { label: "Hired", tone: "success" },
  not_moving_forward: { label: "Not Moving Forward", tone: "danger" },
};

// A recommendation this positive counts as the AI having recommended hire —
// used to compute whether an HR override agreed or disagreed with the AI,
// for the "HR agrees with AI X% of the time" trust metric.
const AI_POSITIVE_RECOMMENDATIONS = ["Strong Hire", "Hire"];
export function isPositiveAIRecommendation(recommendation) {
  return AI_POSITIVE_RECOMMENDATIONS.includes(recommendation);
}

export const DEBRIEF_CANDIDATES = [
  {
    id: "deb-ananya-menon",
    name: "Ananya Menon",
    initials: "AM",
    role: "Software Engineer",
    completedAt: "2026-08-08",
    aiRank: 1,
    debriefStatus: "hr_reviewing",
    override: null,
    evidenceSnippet:
      "Explained a custom Redis-based idempotency system that deduplicated payment webhooks under retries.",
    report: {
      recommendation: "Strong Hire",
      summary:
        "Consistently reasoned from first principles rather than reciting patterns — walked through trade-offs unprompted and caught her own edge cases before being asked.",
      technicalDepth: {
        assessment:
          "Reasons about distributed-systems failure modes fluently, not just the happy path. When asked to design a webhook receiver, she immediately raised delivery-order and duplicate-delivery as the two things that break naive implementations, then walked through her actual fix.",
        evidence: [
          "\"We were getting duplicate charge events from the payment provider on retries, so I keyed idempotency off the provider's event ID in Redis with a short TTL — if the key exists, we return the cached response instead of reprocessing.\"",
          "\"I'd reject a queue-based approach here unless we also had a dead-letter queue, because a poison message would otherwise block everything behind it.\"",
        ],
      },
      communicationClarity: {
        assessment:
          "Explains technical decisions in the order a listener needs them — problem, constraint, then solution — without being prompted to structure her answer that way.",
        evidence: [
          "\"So the constraint was: we can't lose an event, but we also can't double-charge someone. That's why idempotency had to live in front of the charge logic, not after it.\"",
          "When asked to explain the same system to a non-technical stakeholder, she dropped the Redis/TTL specifics and reframed it as \"a receipt number so we never charge someone twice for the same order.\"",
        ],
      },
      strengths: [
        {
          title: "Designs for failure, not just for the spec",
          evidence:
            "Volunteered retry and duplicate-delivery handling for the webhook design question before being asked — treated it as part of the problem, not an edge case.",
        },
        {
          title: "Comfortable owning a system end to end",
          evidence:
            "Described taking the idempotency system from a postmortem finding to a shipped fix, including writing the runbook for on-call.",
        },
      ],
      gaps: [
        {
          title: "Limited exposure to multi-region deployments",
          evidence:
            "When asked how the Redis-based approach would change across regions, she reasoned through it live rather than describing prior experience with it — a sound answer, but not a tested one.",
        },
      ],
      nextSteps: [
        "Final round: have her whiteboard the multi-region version of the idempotency system with the infra team, since that's the one gap without direct prior experience behind it.",
        "Loop in the payments team lead — the webhook example maps closely to a real open problem in that area.",
      ],
      transcript: [
        {
          q: "Design a system that receives payment webhooks and updates order status.",
          a: "I'd start by assuming the provider can deliver the same event more than once and out of order. So the receiver keys off the provider's event ID, checks Redis for that ID first, and only processes if it's new — otherwise it returns the cached result. That way retries are safe.",
        },
        {
          q: "What would you change if this had to run across three regions?",
          a: "Redis alone wouldn't be enough unless it's replicated with strong consistency, which gets expensive. I'd probably move the idempotency check to the database with a unique constraint on the event ID instead, and let the insert itself fail fast on a duplicate.",
        },
        {
          q: "Tell me about a time you disagreed with a technical decision on your team.",
          a: "We were about to add a message queue for something that was really just two services talking directly. I pushed for a direct API call instead, since the queue added operational cost without solving a real ordering or backpressure problem we had.",
        },
      ],
    },
  },
  {
    id: "deb-karthik-rao",
    name: "Karthik Rao",
    initials: "KR",
    role: "Software Engineer",
    completedAt: "2026-08-08",
    aiRank: 2,
    debriefStatus: "report_ready",
    override: null,
    evidenceSnippet: "Built a rate limiter from scratch using a sliding-window counter, correctly citing its memory trade-off.",
    report: {
      recommendation: "Hire",
      summary:
        "Solid working knowledge with correct instincts, but leans on describing what he'd look up rather than reasoning it through live in a couple of spots.",
      technicalDepth: {
        assessment:
          "Gets to a working answer reliably, and explains trade-offs when asked, but needs a nudge to go past the first correct answer rather than volunteering the second-order concern himself.",
        evidence: [
          "\"A sliding-window counter is more accurate than fixed-window but uses more memory since you're tracking timestamps, not just a count.\"",
          "When asked what happens under a thundering-herd retry storm, he needed a follow-up prompt before mentioning backoff.",
        ],
      },
      communicationClarity: {
        assessment:
          "Clear and direct on questions inside his experience; answers get noticeably shorter and more hedged outside it, which is honest but worth probing further.",
        evidence: [
          "\"Honestly I haven't had to debug a production memory leak myself, I've mostly read about the tooling for it.\"",
        ],
      },
      strengths: [
        {
          title: "Correct default instincts",
          evidence: "Picked sliding-window over fixed-window unprompted and named the actual reason, not just the term.",
        },
      ],
      gaps: [
        {
          title: "Doesn't proactively surface second-order failure modes",
          evidence: "Needed a follow-up question to raise backoff/retry-storm behavior rather than volunteering it.",
        },
        {
          title: "Limited hands-on production debugging experience",
          evidence: "Directly said his memory-leak knowledge is from reading, not from having debugged one himself.",
        },
      ],
      nextSteps: [
        "Final round: pair him on a live debugging exercise rather than a design question, to see how he reasons under less structure.",
      ],
      transcript: [
        {
          q: "How would you implement a rate limiter for an API?",
          a: "I'd use a sliding-window counter — for each client, track request timestamps in the last window and count how many fall inside it. It's more accurate than a fixed window, which lets you burst right at the boundary, but it costs more memory since you're storing timestamps instead of one counter.",
        },
        {
          q: "What happens if a lot of clients get rate-limited at the same time and all retry immediately?",
          a: "That could cause a spike again right after... I think you'd want them to back off before retrying rather than hitting it again immediately.",
        },
      ],
    },
  },
  {
    id: "deb-rohan-desai",
    name: "Rohan Desai",
    initials: "RD",
    role: "Software Engineer",
    completedAt: "2026-08-07",
    aiRank: 3,
    debriefStatus: "report_ready",
    override: null,
    evidenceSnippet: "Correctly identified an N+1 query in a code sample, but proposed fixes that introduced a new race condition.",
    report: {
      recommendation: "Leaning No",
      summary:
        "Spots problems accurately but the fixes he proposes tend to introduce a new issue of similar size — a pattern that showed up twice, not once.",
      technicalDepth: {
        assessment:
          "Diagnosis is a real strength; the follow-through to a safe fix is the weak point, and it wasn't a one-off — the same pattern (right diagnosis, unsafe fix) showed up on two separate questions.",
        evidence: [
          "Correctly flagged an N+1 query in a code review sample, but his proposed fix (caching the query result in a module-level dict) would go stale across requests without an invalidation strategy — he didn't raise that himself.",
          "On a separate concurrency question, correctly identified a race condition, then proposed a fix using a global lock without addressing the throughput cost he'd need to justify it.",
        ],
      },
      communicationClarity: {
        assessment: "Explains his diagnosis clearly and confidently; the gap shows up specifically in the solution step, not in how he communicates.",
        evidence: [
          "\"Yeah that's an N+1 — it's re-querying inside the loop instead of batching.\" (accurate, immediate)",
        ],
      },
      strengths: [
        {
          title: "Strong at spotting the actual problem",
          evidence: "Correctly diagnosed both the N+1 query and the race condition without hints, on the first pass.",
        },
      ],
      gaps: [
        {
          title: "Proposed fixes introduce new problems of similar severity",
          evidence: "Both the caching fix and the locking fix were proposed without surfacing their own new risk (stale cache, throughput cost) unprompted.",
        },
      ],
      nextSteps: [
        "If moving forward, structure the final round around 'fix and then defend the fix' rather than diagnosis alone — that's specifically where the gap showed up.",
      ],
      transcript: [
        {
          q: "What's wrong with this code, and how would you fix it?",
          a: "It's an N+1 — you're querying inside the loop instead of batching. I'd cache the result the first time it's looked up so later calls just read from memory.",
        },
        {
          q: "What happens if the underlying data changes after it's cached?",
          a: "Hm — I guess it would serve the old value until... we'd need to clear the cache somehow, I didn't build that part in.",
        },
      ],
    },
  },
  {
    id: "deb-priyanka-joshi",
    name: "Priyanka Joshi",
    initials: "PJ",
    role: "Frontend Developer",
    completedAt: "2026-08-06",
    aiRank: 1,
    debriefStatus: "report_ready",
    override: null,
    evidenceSnippet: "Diagnosed a re-render performance issue by reasoning about reference equality, not by guessing at useMemo.",
    report: {
      recommendation: "Strong Hire",
      summary:
        "Reasons about React's rendering model rather than pattern-matching to a memoized-hook checklist — the difference showed clearly on the debugging exercise.",
      technicalDepth: {
        assessment:
          "Diagnoses rendering issues from the actual mechanism (reference equality, when React decides to re-render) rather than reaching for useMemo/useCallback as a reflex.",
        evidence: [
          "\"The list re-renders every keystroke because the onClick handler is a new function reference each render, so React sees every child prop as changed — wrapping it in useCallback isn't the fix by itself, the parent's re-render still happens, so I'd also look at whether the parent needs to re-render that often at all.\"",
        ],
      },
      communicationClarity: {
        assessment: "Narrates her own debugging process out loud in a way that's easy to follow, including the dead ends.",
        evidence: [
          "\"My first guess was memoization, but that would've just hidden the actual cause, so I backed up and checked what was actually changing between renders first.\"",
        ],
      },
      strengths: [
        { title: "Debugs from the rendering model, not from a checklist", evidence: "Explicitly rejected a surface-level useCallback fix because it wouldn't address the parent re-render." },
        { title: "Talks through failed approaches honestly", evidence: "Volunteered that her first instinct was wrong and explained why, unprompted." },
      ],
      gaps: [
        { title: "Less exposure to server-rendered / streaming React", evidence: "Answered the RSC question correctly at a conceptual level but flagged she hasn't shipped with it directly." },
      ],
      nextSteps: [
        "Final round: pair on an actual PR review from the codebase rather than a synthetic exercise — she engages well with real, messy code based on this interview.",
      ],
      transcript: [
        {
          q: "This list re-renders on every keystroke in an unrelated search box. Why, and what would you do?",
          a: "Most likely the parent re-renders on every keystroke and passes new function/object references down as props each time, so even memoized children see 'changed' props. I'd check what's actually in the parent's state update before reaching for memoization — sometimes the real fix is narrowing what re-renders, not wrapping everything in useMemo.",
        },
      ],
    },
  },
  {
    id: "deb-meera-iyer",
    name: "Meera Iyer",
    initials: "MI",
    role: "Frontend Developer",
    completedAt: "2026-08-09",
    aiRank: 2,
    debriefStatus: "final_scheduled",
    override: null,
    evidenceSnippet: "Built a solid accessible modal from scratch, including focus trapping, without prompting.",
    report: {
      recommendation: "Hire",
      summary:
        "Strong on accessibility fundamentals by default rather than as an afterthought; state-management reasoning is a step behind her component-level work.",
      technicalDepth: {
        assessment:
          "Accessibility is clearly a habit, not a checklist item — focus trapping and escape-to-close came up unprompted. Global state reasoning was correct but slower, needing a follow-up question to get to the right answer.",
        evidence: [
          "\"I'd trap focus inside the modal while it's open and return it to the trigger element on close — otherwise keyboard and screen-reader users lose their place.\"",
          "On a global-state question, she initially reached for prop drilling before the interviewer asked about a five-levels-deep case, at which point she correctly proposed context.",
        ],
      },
      communicationClarity: {
        assessment: "Direct and specific when discussing UI/accessibility; more tentative on architecture questions outside that comfort zone.",
        evidence: ["\"I might be wrong on this one, but I'd guess context is meant for exactly this case?\""],
      },
      strengths: [
        { title: "Accessibility as a default, not an add-on", evidence: "Volunteered focus trapping and escape-to-close without being asked specifically about accessibility." },
      ],
      gaps: [
        { title: "Slower to reach for the right state-management tool", evidence: "Needed a prompt before proposing context for deeply-nested prop drilling." },
      ],
      nextSteps: [
        "Final round scheduled — confirm comfort with the team's actual state-management choice (not just React context) before the offer stage.",
      ],
      transcript: [
        {
          q: "Build a modal component. What do you need to think about beyond just showing and hiding it?",
          a: "Focus needs to move into the modal when it opens and trap there — tab shouldn't escape to the page behind it — and Escape should close it. When it closes, focus should go back to whatever triggered it, or a keyboard user loses their place entirely.",
        },
      ],
    },
  },
  {
    id: "deb-devika-rao",
    name: "Devika Rao",
    initials: "DR",
    role: "Data Scientist",
    completedAt: "2026-08-05",
    aiRank: 1,
    debriefStatus: "report_ready",
    override: null,
    evidenceSnippet: "Chose a simpler baseline model over a neural net and justified it with the actual size of the available dataset.",
    report: {
      recommendation: "Strong Hire",
      summary:
        "Consistently reasons from data constraints to model choice rather than defaulting to the most sophisticated option — argued down her own first instinct when the numbers didn't support it.",
      technicalDepth: {
        assessment:
          "Ties every modeling decision back to a concrete constraint — dataset size, label quality, or latency budget — rather than justifying a choice by its sophistication.",
        evidence: [
          "\"With only about 8,000 labeled examples, a gradient-boosted tree is going to generalize better than a neural net here — I'd only reach for deep learning once we have an order of magnitude more data or a pretrained model to fine-tune from.\"",
          "\"I'd rather ship the boring model with a clear evaluation story than the exciting one I can't confidently explain to the team reviewing it.\"",
        ],
      },
      communicationClarity: {
        assessment: "Explains statistical reasoning in plain terms first, then adds precision — makes her answers accessible without losing rigor.",
        evidence: [
          "\"Precision and recall trade off against each other — if we're flagging fraud, I'd rather over-flag and have a human check than miss real cases, so I'd tune the threshold toward recall.\"",
        ],
      },
      strengths: [
        { title: "Matches model complexity to actual data constraints", evidence: "Explicitly rejected a neural net in favor of gradient boosting, citing the labeled dataset size as the reason." },
        { title: "Explains statistics without losing precision", evidence: "Walked through a precision/recall trade-off in a way a non-technical stakeholder could follow." },
      ],
      gaps: [
        { title: "Less direct experience productionizing models at scale", evidence: "Reasoned correctly about latency budgets in the abstract but hasn't personally owned a model in a high-throughput serving path." },
      ],
      nextSteps: [
        "Final round: bring in whoever owns the model-serving infrastructure, since that's the one area she reasoned through rather than having shipped directly.",
      ],
      transcript: [
        {
          q: "We have 8,000 labeled fraud examples. Would you reach for a neural net?",
          a: "Not at that size, no. A neural net needs a lot more data than that to generalize well, and with 8,000 examples a gradient-boosted tree — something like XGBoost — is going to perform better and be easier to explain to the team signing off on it. I'd revisit deep learning once we have significantly more data or a pretrained model to start from.",
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Nexire AI — mock data.
// Everything the prototype renders lives in this file. No APIs, no database.
// ---------------------------------------------------------------------------

export const PIPELINE_STAGES = [
  { id: "applied", label: "Applied", tone: "neutral" },
  { id: "reviewed", label: "Reviewed", tone: "info" },
  { id: "shortlisted", label: "Shortlisted", tone: "success" },
  { id: "interview", label: "Interview Scheduled", tone: "violet" },
];

// A candidate who has moved forward still counts at every earlier stage they
// passed through — e.g. someone Shortlisted has, by definition, also been
// Applied and Reviewed. Used so a candidate's card shows on every stage
// column up through their current one, not just the latest.
export function hasReachedStage(status, stageId) {
  if (status === "rejected") return false;
  const current = PIPELINE_STAGES.findIndex((s) => s.id === status);
  const target = PIPELINE_STAGES.findIndex((s) => s.id === stageId);
  if (current === -1 || target === -1) return false;
  return current >= target;
}

export const STATUS_META = {
  applied: { label: "Applied", tone: "neutral" },
  reviewed: { label: "Reviewed", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "success" },
  interview: { label: "Interview Scheduled", tone: "violet" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const SOURCE_META = {
  linkedin: "LinkedIn",
  referral: "Referral",
  careers: "Careers page",
  wellfound: "Wellfound",
  email: "Email inbox",
  naukri: "Naukri",
  upload: "Bulk upload",
  github: "GitHub",
};

export const employer = {
  name: "Priya Raghavan",
  role: "Head of Talent",
  company: "Northwind Labs",
  email: "priya@northwindlabs.com",
  initials: "PR",
  plan: "Scale",
};

// jobs and candidates start empty on purpose — see lib/store.jsx. Real ones come
// from "New job post" and résumé intake (bulk upload / Gmail import).

// ---------------------------------------------------------------------------
// Landing page content. Employer-facing only — there are no candidate screens
// in this prototype, so nothing here links to one.
// ---------------------------------------------------------------------------

export const marketing = {
  metrics: [
    { value: "11 hrs", label: "saved per role, per week" },
    { value: "3.4×", label: "faster time to shortlist" },
    { value: "91%", label: "of first screens need no human pass" },
    { value: "128", label: "applicants read per role, in full" },
  ],

  // The interactive product tour. Copy only — each step's visual panel is
  // hand-built in components/landing/ProductTour.jsx.
  tour: [
    {
      id: "post",
      tab: "Post a role",
      eyebrow: "Step 01",
      title: "Describe the job once, in plain language",
      body:
        "No forms to fight. Write what the person will own and Nexire turns it into a weighted scorecard, a screening rubric, and an interview plan — all editable before anything goes live.",
      points: [
        "Scorecard generated from your description, not a template",
        "Weightings and knockout criteria editable per role",
        "Interview plan drafted from the same source",
      ],
    },
    {
      id: "source",
      tab: "Source from everywhere",
      eyebrow: "Step 02",
      title: "Every candidate, from everywhere they are",
      body: "Three ways to find candidates for this role — combined into one pipeline.",
      points: [
        "Every résumé becomes structured data — skills, tenure, education, projects extracted as fields",
        "Every candidate scored against this role's rubric, not a generic one",
      ],
    },
    {
      id: "verify",
      tab: "Compare and verify",
      eyebrow: "Step 03",
      title: "Claims checked against real work",
      body:
        "Candidates are ranked, then checked more deeply — projects, public work, and profile history — before anyone reaches an interview.",
      points: ["Claims cross-checked against public work where it exists"],
    },
    {
      id: "interview",
      tab: "AI interview",
      eyebrow: "Step 04",
      title: "A real interviewer, on screen, who adapts as it goes",
      body:
        "Each promising candidate meets Arjun — a lifelike AI interviewer they can see and talk to, face to face. Twenty-five minutes, built from the role and their own history, with follow-ups drawn from what they just said. Most AI interviewers run a fixed script and wait for answers. Ours reads the room — it adjusts as the conversation goes, so candidates open up instead of freezing up.",
      points: [
        "A photoreal interviewer who makes eye contact and reacts",
        "Questions written from that person's actual experience",
        "Adaptive follow-ups probe the answer they just gave",
        "Runs whenever the candidate is free, including 2 AM",
      ],
    },
    {
      id: "report",
      tab: "Read the report",
      eyebrow: "Step 05",
      title: "Findings you can check, not a black-box score",
      body:
        "Strengths, gaps, and technical depth — each one linked to the exact moment in the transcript that produced it. Ninety seconds to read, and you can disagree with the reasoning because you can see it.",
      points: [
        "Every claim traces to a quote you can read",
        "Scored against your rubric, not a global benchmark",
        "Identity fields withheld from the scoring pass",
      ],
    },
    {
      id: "decide",
      tab: "Decide",
      eyebrow: "Step 06",
      title: "You move people, nothing moves itself",
      body:
        "Work the board, compare shortlisted candidates side by side, and advance who you want. Nexire never advances, holds, or rejects anyone on its own.",
      points: [
        "Drag-and-drop pipeline across four stages",
        "Side-by-side comparison of shortlisted candidates",
        "Every decision logged against a human name",
      ],
    },
  ],

  // Feature explorer — grouped, click-to-expand.
  featureGroups: [
    {
      id: "sourcing",
      label: "Sourcing",
      icon: "inbox",
      blurb: "Get everyone worth considering into one place.",
      features: [
        {
          title: "One pipeline, every source",
          summary: "Inbox forwards, careers page, LinkedIn, Wellfound, Naukri — deduplicated into a single board.",
          detail:
            "Forward jobs@ to Nexire and connect your careers page, and every inbound application lands in the same pipeline regardless of where it came from. Duplicates across sources are merged into one candidate record, so the same person applying twice doesn't become two rows to review.",
          bullets: ["Email forwarding rules", "Careers page embed", "Job-board connectors", "Automatic de-duplication"],
        },
        {
          title: "Open-market search",
          summary: "Look beyond the inbox at public developer profiles and our opted-in candidate network.",
          detail:
            "The best person for a role usually isn't applying to it. Nexire searches public profiles and its own opted-in network alongside your applicants, then ranks everyone together. Only public information is used, anyone surfaced this way is told how they were found, and one click removes them from consideration and future searches.",
          bullets: ["Public profiles only", "Opted-in candidate network", "Candidates always notified", "One-click removal"],
        },
        {
          title: "Project and repository matching",
          summary: "We check what people have actually built, not just what they listed.",
          detail:
            "A skills row on a résumé costs nothing to write. Three years of commits on the same problem is a different kind of evidence. Nexire reads public repositories, commit history, and published work, then matches what someone has shipped against what your role actually needs — and shows you the reasoning.",
          bullets: ["Commit history read, not just repo names", "Claims cross-checked against code", "Match reason shown in plain language"],
        },
        {
          title: "Talent pool that persists",
          summary: "Strong candidates for a closed role stay findable for the next one.",
          detail:
            "When you close a req, the people you liked don't disappear. They stay in your pool with their parsed profile and report intact, so the next similar role starts with a warm shortlist instead of an empty one.",
          bullets: ["Reports retained per your policy", "Re-surfaced on matching roles", "Candidate can opt out any time"],
        },
      ],
    },
    {
      id: "screening",
      label: "Screening",
      icon: "doc",
      blurb: "Turn a pile of PDFs into something you can reason about.",
      features: [
        {
          title: "Résumés as structured data",
          summary: "Skills, tenure, education and projects as fields you can filter and sort.",
          detail:
            "Every résumé is parsed into a consistent shape: named skills with a level and years attached, roles with dates and locations, education, certifications, and side projects. You stop opening PDFs and start filtering a table.",
          bullets: ["Consistent fields across every source", "Skill levels and years inferred", "Original file always one click away"],
        },
        {
          title: "Rubric-based scoring",
          summary: "Generated from your job description, weighted, and fully editable.",
          detail:
            "Nexire reads your description and proposes a weighted rubric — which skills matter, how much, and what disqualifies. You edit the weights, add must-haves and knockout criteria, and every candidate is scored against that, not a generic industry model.",
          bullets: ["Weights editable per role", "Must-have and knockout criteria", "Score always explains its inputs"],
        },
        {
          title: "Signals, not verdicts",
          summary: "The parser flags what it noticed and leaves the judgement to you.",
          detail:
            "Instead of silently filtering people out, Nexire surfaces what stood out: a notice period that may not work, a level mismatch, a stronger fit for a different req. Nothing is auto-rejected — a flag is an invitation to look, not a decision.",
          bullets: ["No silent auto-rejects", "Flags explain themselves", "Route candidates to a better-fitting role"],
        },
      ],
    },
    {
      id: "interviewing",
      label: "Interviewing",
      icon: "mic",
      blurb: "A face-to-face first round that goes deeper than a phone screen.",
      features: [
        {
          title: "A lifelike AI interviewer",
          summary: "Candidates meet Arjun — a photoreal interviewer they see and talk to, not a disembodied voice.",
          detail:
            "Arjun appears on screen as a person: he makes eye contact, nods, waits while someone thinks, and reacts to what they say. Candidates consistently tell us it stops feeling like a test within the first two minutes. The realism isn't a gimmick — people give fuller, more honest answers to a face than to a recording prompt.",
          bullets: ["Photoreal on-screen interviewer", "Natural eye contact and reactions", "Candidate's own camera stays optional"],
        },
        {
          title: "Adaptive questioning",
          summary: "Questions built from the role and the person, with follow-ups drawn from their answers.",
          detail:
            "Arjun opens with questions written from that candidate's own history, then follows the thread of what they actually say. When an answer is vague he pushes for a mechanism; when an answer is strong he goes a level deeper. That's how you separate someone who has done the thing from someone who has read about it.",
          bullets: ["Role-specific opening questions", "Follow-ups generated live", "Full transcript retained"],
        },
        {
          title: "Paced for the candidate",
          summary: "No rigid timers. Questions can be repeated or rephrased as often as needed.",
          detail:
            "Arjun reads tone and pacing, not just words. If someone sounds nervous he slows down and reassures; if they ask for a question again, they get it. Nobody is scored on how well they handle a stopwatch.",
          bullets: ["No countdown pressure", "Repeat or rephrase on request", "Resumes where it left off if a connection drops"],
        },
        {
          title: "Consent-first by default",
          summary: "Candidates see exactly what is recorded, assessed, and retained before anything starts.",
          detail:
            "Before anything is captured, the candidate reads a plain-language screen: what's recorded, how it's assessed, who reads it, and how long it's kept. Arjun is on camera; the candidate doesn't have to be, and their own video is never scored. They can decline and ask for a human screen instead, and they can withdraw mid-interview — a partial transcript is deleted rather than scored.",
          bullets: ["Explicit consent required", "Candidate camera always optional", "Human-screen alternative offered", "Withdraw at any point"],
        },
        {
          title: "Scheduling that isn't scheduling",
          summary: "Interviews run when the candidate is free — no calendar coordination.",
          detail:
            "The invite goes out within an hour of an application clearing your threshold and stays valid for a week. Candidates take it at 6 AM or 11 PM, on whatever device they have. You never trade six emails to find a slot.",
          bullets: ["Invite auto-sent above your threshold", "Valid for seven days", "Works on desktop or mobile"],
        },
      ],
    },
    {
      id: "deciding",
      label: "Deciding",
      icon: "board",
      blurb: "Everything a human needs to make the call, and nothing that makes it for them.",
      features: [
        {
          title: "Evidence-linked reports",
          summary: "Strengths, gaps, and technical depth, each traced to a transcript moment.",
          detail:
            "A report leads with a position and the confidence behind it, then backs every finding with the exchange that produced it. You can read the quote, disagree, and overrule — which is the whole point of showing it.",
          bullets: ["Quote behind every claim", "Confidence stated explicitly", "Exportable as PDF for the panel"],
        },
        {
          title: "Kanban pipeline",
          summary: "Applied → Reviewed → Shortlisted → Interview Scheduled, drag to move.",
          detail:
            "Each role gets a board you can actually work. Drag a card between stages, or use the keyboard. Stage counts, time-in-stage, and unreviewed totals stay visible so nothing quietly rots in a column.",
          bullets: ["Drag-and-drop or keyboard", "Time-in-stage visible", "Rejected kept out of the way but recoverable"],
        },
        {
          title: "Bias controls",
          summary: "Name, photo, age, and gender withheld from the scoring pass.",
          detail:
            "The model never sees identity fields when it scores. Reports are structured identically for every candidate so they're genuinely comparable, and the rubric is fixed before anyone is screened rather than adjusted to fit a favourite.",
          bullets: ["Identity fields blinded", "Rubric fixed before screening", "Consistent report structure"],
        },
        {
          title: "Team roles and audit trail",
          summary: "Recruiter, Hiring Manager, Interviewer, Admin — with every decision attributed.",
          endNote: true,
          detail:
            "Invite your team with a role that matches what they do. Every advance, hold, and reject is logged against a human name and time, so three months later you can reconstruct exactly why someone moved forward.",
          bullets: ["Four role types", "Per-candidate activity timeline", "Daily digests and instant alerts"],
        },
      ],
    },
  ],

  // ---------------------------------------------------------------- problem
  problem: {
    headline: "Too many résumés. Too little proof. Not enough time.",
    intro:
      "Recruiters drown in unscreened résumés spread across email, job boards and platforms — while the people who could actually do the job never surface.",
    points: [
      {
        icon: "inbox",
        title: "Hundreds of applications per role",
        body: "Most are never properly read. The first sixty get a skim; the rest get a keyword filter.",
      },
      {
        icon: "doc",
        title: "Résumés show claims, not proof",
        body: "Anyone can write “distributed systems” in a skills row. Almost nobody checks what was actually built.",
      },
      {
        icon: "clock",
        title: "Sourcing and scheduling eat the week",
        body: "Chasing profiles, screening calls and calendar tetris consume the hours that should go to hiring decisions.",
      },
      {
        icon: "users",
        title: "Small teams feel it worst",
        body: "Without a dedicated recruiting function, hiring lands on a founder or engineer who already has a job.",
      },
    ],
  },

  // --------------------------------------------------------------- solution
  solution: {
    headline: "Nexire AI finds, verifies, and screens candidates — so you just decide.",
    body:
      "We pull candidates from the open market and from every résumé already sitting in your inbox, then verify real skill against the projects and code they've actually shipped. Each promising person has a real conversation with an AI interviewer that adapts as it goes. You get a ranked shortlist where every claim is backed by evidence you can check.",
  },

  // ------------------------------------------------------------ how it works
  howItWorks: [
    {
      icon: "briefcase",
      title: "Post a role",
      body: "Describe what you're hiring for in plain language. Nexire builds the scorecard from it.",
    },
    {
      icon: "search",
      title: "Nexire finds candidates",
      body: "Sourced from the open market and GitHub, alongside every résumé already arriving by email, upload or job board.",
    },
    {
      icon: "filter",
      title: "Duplicates and noise removed",
      body: "The same person applying twice becomes one record. Every unique candidate gets a fair look.",
    },
    {
      icon: "mic",
      title: "AI interview, like a real conversation",
      body: "Adaptive and unhurried. Follow-ups come from what the candidate just said, never from a fixed script.",
    },
    {
      icon: "sparkle",
      title: "Evidence-based report",
      body: "Strengths, weaknesses and real quotes from the interview — not a black-box score.",
    },
    {
      icon: "users",
      title: "You review and decide",
      body: "A ranked shortlist. One click to advance, hold, or overrule anything Nexire suggested.",
    },
  ],

  // ------------------------------------------------------------ core features
  coreFeatures: [
    {
      icon: "search",
      title: "Open-market candidate search",
      body: "Finds people beyond your applicants, matched on real skills and project history.",
    },
    {
      icon: "link",
      title: "GitHub & project verification",
      body: "Checks what a candidate has actually built, not just what they listed.",
    },
    {
      icon: "inbox",
      title: "Universal résumé inbox",
      body: "Email, job boards and manual uploads land in one place, automatically deduplicated.",
    },
    {
      icon: "waves",
      title: "Emotion-aware AI interviewer",
      body: "Reads tone and pacing to ask better questions and keep candidates comfortable — never to score or reject them.",
    },
    {
      icon: "sparkle",
      title: "Evidence-based reports",
      body: "Every insight traces to a specific moment in the interview, not a hidden number.",
    },
    {
      icon: "shield",
      title: "Human-final-call design",
      body: "Nexire ranks and surfaces. Your team makes every actual hiring decision.",
    },
    {
      icon: "grid",
      title: "Role-based auto-segregation",
      body: "Bulk-uploaded résumés sorted and counted by role, automatically.",
    },
    {
      icon: "trend",
      title: "Job distribution",
      body: "Post once and reach multiple job boards from a single place.",
      comingSoon: true,
    },
  ],

  // ------------------------------------------------------------------ trust
  trustPoints: [
    { icon: "shield", label: "DPDP-compliant by design" },
    { icon: "sparkle", label: "Candidates always know when AI is involved" },
    { icon: "users", label: "AI never makes the final hiring decision" },
  ],

  // Outreach flow shown on the landing page, after the tour.
  outreachSteps: [
    {
      icon: "star",
      title: "Nexire shortlists",
      body: "The ranked pipeline surfaces the strongest matches automatically — no manual sorting needed.",
    },
    {
      icon: "mail",
      title: "We reach out",
      body: "Each shortlisted candidate is emailed to book their interview.",
      badge: "Calling — coming soon",
    },
    {
      icon: "users",
      title: "Arjun interviews them",
      body: "A face-to-face conversation, whenever the candidate is free.",
    },
    {
      icon: "sparkle",
      title: "The report lands",
      body: "Evidence-linked findings waiting in your dashboard the same day.",
    },
    {
      icon: "check",
      title: "Candidate hears back",
      body: "Once a decision is made, they get a clear email — moving forward, or a respectful pass. No one's left wondering.",
    },
    {
      icon: "clock",
      title: "Final interview, booked automatically",
      body: "If they're moving forward, Nexire checks their availability and the hiring manager's, and books the final round directly — no manual back-and-forth.",
    },
  ],

  // The on-screen interviewer.
  interviewer: {
    name: "Arjun",
    role: "AI interviewer",
    tagline: "Photoreal, on camera, and genuinely conversational.",
  },

  // "How the interviewer behaves" cards.
  interviewPoints: [
    {
      icon: "users",
      title: "A face, not a form",
      body: "Appears on screen as a person you're talking with, not a countdown timer or a recording prompt.",
    },
    {
      icon: "waves",
      title: "Listens closely",
      body: "Picks up on tone, pacing, and hesitation — not just the words.",
    },
    {
      icon: "sparkle",
      title: "Adapts in real time",
      body: "Slows down and reassures if a candidate seems nervous, goes deeper if they're confident.",
    },
    {
      icon: "shield",
      title: "Stays transparent",
      body: "Every insight is evidence-based and lands in the report — never a hidden score.",
    },
  ],

  interviewComparison: [
    { typical: "A recording prompt and a countdown", nexire: "A person on screen who waits while you think" },
    { typical: "Follows a fixed script regardless of the answer", nexire: "Adapts the next question to what was just said" },
    { typical: "One-way video you record into the void", nexire: "A real back-and-forth, with reactions" },
    { typical: "Scores against a rubric nobody sees", nexire: "Shows the evidence behind every finding" },
  ],

  // Project-matching examples, shown side by side.
  matchExamples: [
    {
      id: "ledger",
      candidate: "Ananya Menon",
      initials: "AM",
      built: {
        label: "What she built",
        title: "ledgerkit",
        meta: "Open source · 2.4k stars · 3 years of commits",
        detail: "A double-entry ledger where every posting carries a unique constraint, so a retry can't double-write.",
        tech: ["Go", "PostgreSQL", "Redis"],
      },
      need: {
        label: "What the role needs",
        title: "Idempotent payment writes",
        meta: "Senior Backend Engineer · first quarter",
        detail: "The ledger must never double-post a payout, even when a flaky client retries the same request.",
        tech: ["Go", "PostgreSQL"],
      },
      reason: "She has already shipped a fix for the exact failure mode this role opens with.",
    },
    {
      id: "ranking",
      candidate: "Karthik Rao",
      initials: "KR",
      built: {
        label: "What he built",
        title: "ltr-bench",
        meta: "Open source · 60 experiments logged publicly",
        detail: "A benchmark documenting where offline ranking metrics stop predicting online results.",
        tech: ["Python", "PyTorch"],
      },
      need: {
        label: "What the role needs",
        title: "Trustworthy offline evaluation",
        meta: "ML Engineer, Ranking · core responsibility",
        detail: "Build the harness the team believes before it ships a model to live traffic.",
        tech: ["Python", "Experimentation"],
      },
      reason: "The thing we'd ask him to build first, he has already built in public.",
    },
    {
      id: "density",
      candidate: "Meera Iyer",
      initials: "MI",
      built: {
        label: "What she shipped",
        title: "Zoho Analytics query builder",
        meta: "Case study · six iterations, two of them failures",
        detail: "A dense, keyboard-driven surface with task-completion numbers attached to the redesign.",
        tech: ["Figma", "Research"],
      },
      need: {
        label: "What the role needs",
        title: "An operator console people live in",
        meta: "Product Designer · primary surface",
        detail: "Information density that stays scannable through an eight-hour shift.",
        tech: ["Figma", "Design systems"],
      },
      reason: "Her closest public work is the same problem, at the same density.",
    },
  ],

  sources: [
    {
      key: "applied",
      title: "People who applied to you",
      detail: "Inbox forwards, your careers page, and the job boards you post to.",
      count: "128 this month",
      tone: "neutral",
    },
    {
      key: "public",
      title: "Public developer profiles",
      detail: "Open repositories, commit history, published writing, public portfolios.",
      count: "14,820 scanned",
      tone: "violet",
    },
    {
      key: "network",
      title: "Our candidate network",
      detail: "People who have opted in to be considered for roles like yours.",
      count: "3,214 opted in",
      tone: "info",
    },
  ],

  beforeAfter: {
    before: {
      label: "Without Nexire",
      tone: "muted",
      rows: [
        "400 résumés, and you skim the first 60",
        "Keyword filters quietly drop good people",
        "Phone screens eat six hours a week",
        "\"Seemed sharp\" is the whole record of a screen",
        "Two weeks to a shortlist, if nothing slips",
      ],
    },
    after: {
      label: "With Nexire",
      tone: "primary",
      rows: [
        "All 400 read in full, none skimmed",
        "Scored on a rubric you wrote and can see",
        "First round runs itself, overnight",
        "Every finding linked to a transcript quote",
        "Same-day shortlist, with evidence attached",
      ],
    },
  },

  testimonials: [
    {
      quote:
        "We went from a two-week screening backlog to same-day shortlists. The reports are specific enough that I actually trust them.",
      name: "Divya Raman",
      role: "VP People, Ledgerly",
      initials: "DR",
    },
    {
      quote:
        "The part that sold the team was the transcript links. Every claim in the report points at the moment it came from.",
      name: "Marcus Hale",
      role: "Head of Engineering, Kestrel",
      initials: "MH",
    },
    {
      quote:
        "It found a staff engineer who never applied to us. Her open-source work was the entire reason we looked.",
      name: "Anjali Prasad",
      role: "Founder, Fieldnote",
      initials: "AP",
    },
  ],

  faqs: [
    {
      q: "Does the AI make the hiring decision?",
      a: "No. Nexire produces a structured report with the evidence behind it. Every advance, hold, and reject is a human call made in your dashboard, logged against a name.",
    },
    {
      q: "Where exactly do you search?",
      a: "Public GitHub activity, public developer profiles and portfolios, our own opted-in candidate network, and everyone who applies to you directly. Nothing private, nothing behind a login, nothing bought from a data broker.",
    },
    {
      q: "How do you stop the model being biased?",
      a: "Name, photo, age, and gender are withheld from the scoring pass. The rubric is fixed before anyone is screened, and every report follows the same structure so candidates are genuinely comparable.",
    },
    {
      q: "What does a candidate experience?",
      a: "A plain-language consent screen, then a face-to-face conversation with Arjun, our on-screen AI interviewer. He's photoreal and reacts in real time, so it feels like a call rather than a recording booth. Candidates can decline and ask for a human screen, and they can withdraw mid-interview.",
    },
    {
      q: "Is the interviewer a real person?",
      a: "No, and we say so plainly before anything starts. Arjun is an AI presented as a lifelike avatar because people give fuller answers to a face than to a recording prompt — but he is never passed off as human.",
    },
    {
      q: "Does the candidate have to be on camera?",
      a: "No. Arjun is on camera; the candidate doesn't have to be. Their video is never recorded or scored, and appearance plays no part in the assessment.",
    },
    {
      q: "Can we edit the scoring rubric?",
      a: "Yes. The generated rubric is a starting point — weightings, must-haves, and knockout criteria are all editable per role, and the score always shows its inputs.",
    },
    {
      q: "How long does setup take?",
      a: "Post your first role and you're live. Most teams have their careers page connected and inbox forwarding configured inside an afternoon.",
    },
  ],
};
// ---------------------------------------------------------------------------
// Employer onboarding — company + role selection
// ---------------------------------------------------------------------------

export const companies = [
  { id: "co-northwind", name: "Northwind Labs", initials: "NL", industry: "Payments infrastructure", size: "40 people", location: "Bengaluru, IN", openRoles: 3, verified: true },
  { id: "co-ledgerly", name: "Ledgerly", initials: "LY", industry: "Fintech", size: "180 people", location: "Mumbai, IN", openRoles: 7, verified: true },
  { id: "co-kestrel", name: "Kestrel", initials: "KE", industry: "Developer tools", size: "65 people", location: "Remote", openRoles: 2, verified: true },
  { id: "co-auric", name: "Auric Health", initials: "AH", industry: "Healthtech", size: "320 people", location: "Hyderabad, IN", openRoles: 11, verified: false },
  { id: "co-fieldnote", name: "Fieldnote", initials: "FN", industry: "Field operations SaaS", size: "24 people", location: "Pune, IN", openRoles: 1, verified: false },
  { id: "co-tessell", name: "Tessell", initials: "TE", industry: "Data infrastructure", size: "140 people", location: "Bengaluru, IN", openRoles: 5, verified: true },
  { id: "co-marlin", name: "Marlin Logistics", initials: "ML", industry: "Logistics", size: "900 people", location: "Chennai, IN", openRoles: 14, verified: true },
  { id: "co-orbit", name: "Orbit Studio", initials: "OS", industry: "Design consultancy", size: "12 people", location: "Goa, IN", openRoles: 1, verified: false },
];

export const companyRoles = [
  {
    id: "recruiter",
    label: "Recruiter",
    summary: "You source, screen, and move candidates through the pipeline.",
    permissions: ["Post and edit roles", "Move candidates between stages", "Read every AI report"],
  },
  {
    id: "hiring-manager",
    label: "Hiring Manager",
    summary: "You own the req and make the final call on who advances.",
    permissions: ["Approve and close roles", "Final decision on offers", "Read every AI report"],
  },
  {
    id: "interviewer",
    label: "Interviewer",
    summary: "You take the human rounds and leave structured feedback.",
    permissions: ["Read assigned candidates", "Submit scorecards", "No pipeline edits"],
  },
  {
    id: "admin",
    label: "Workspace Admin",
    summary: "You manage billing, integrations, and who has access.",
    permissions: ["Manage team and billing", "Configure screening and retention", "Full workspace access"],
  },
];

export const INDUSTRIES = [
  "Payments infrastructure",
  "Fintech",
  "Developer tools",
  "Healthtech",
  "E-commerce",
  "Logistics",
  "Data infrastructure",
  "Consumer apps",
  "Consultancy",
  "Other",
];

export const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,000+"];

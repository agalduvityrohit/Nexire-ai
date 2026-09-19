// Candidate sourcing — mock data.
//
// UNDER DEVELOPMENT. No connector is live: nothing here queries LinkedIn,
// Indeed, Naukri, Wellfound or Stack Overflow. The profiles below are
// fictional and exist so the screen's layout, ranking and filtering can be
// designed before any real integration work starts.
//
// GitHub is deliberately absent from this list — that source is real now
// (see components/dashboard/GithubSourcingPanel.jsx and lib/server/github.js),
// so it lives on its own tab instead of alongside fictional data.
//
// Each site has genuinely different terms around automated access. Whichever
// ones survive product review will each need their own approach — official API,
// partner agreement, or a manual/assisted flow — before a single request is made.

export const SOURCE_SITES = [
  {
    id: "linkedin",
    label: "LinkedIn",
    kind: "Professional network",
    reach: "12.4M profiles in India",
    status: "planned",
    note: "Needs Talent Solutions partner access. Scraping is against their terms.",
  },
  {
    id: "indeed",
    label: "Indeed",
    kind: "Job board + résumé database",
    reach: "6.1M résumés",
    status: "planned",
    note: "Employer résumé search is a paid product with its own API.",
  },
  {
    id: "naukri",
    label: "Naukri",
    kind: "Job board (India)",
    reach: "8.9M résumés",
    status: "planned",
    note: "Resdex subscription required for database access.",
  },
  {
    id: "wellfound",
    label: "Wellfound",
    kind: "Startup talent network",
    reach: "980k profiles",
    status: "planned",
    note: "Recruiter Pro seat gives candidate search.",
  },
  {
    id: "stackoverflow",
    label: "Stack Overflow",
    kind: "Public Q&A",
    reach: "2.7M contributors",
    status: "planned",
    note: "Public API with strict rate limits.",
  },
];

export const SOURCE_TONES = {
  linkedin: "info",
  indeed: "violet",
  naukri: "warn",
  wellfound: "accent",
  stackoverflow: "neutral",
};

// Fictional profiles. `skills` drives the match score against a selected job.
export const SOURCED_PROFILES = [
  {
    id: "s3",
    name: "Sneha Kulkarni",
    initials: "SK",
    headline: "SDE-3, Platform · Atlassian",
    location: "Bengaluru, IN",
    source: "linkedin",
    handle: "in/snehakulkarni",
    skills: ["Java", "PostgreSQL", "Kubernetes", "AWS"],
    signal: "Led shard rebalancing across a 900-instance Postgres fleet.",
    experience: 8,
    openToWork: false,
  },
  {
    id: "s4",
    name: "Rahul Bhatt",
    initials: "RB",
    headline: "Backend Engineer · Zerodha",
    location: "Bengaluru, IN",
    source: "naukri",
    handle: "naukri.com/rahulbhatt",
    skills: ["Go", "PostgreSQL", "gRPC", "Docker"],
    signal: "Updated résumé 3 days ago · 30-day notice.",
    experience: 5,
    openToWork: true,
  },
  {
    id: "s6",
    name: "Nandini Suresh",
    initials: "NS",
    headline: "Applied Scientist · ex-Amazon",
    location: "Hyderabad, IN",
    source: "linkedin",
    handle: "in/nandinisuresh",
    skills: ["Python", "PyTorch", "Feature stores"],
    signal: "Four papers, every one with runnable released code.",
    experience: 7,
    openToWork: true,
  },
  {
    id: "s7",
    name: "Imran Qureshi",
    initials: "IQ",
    headline: "Senior Data Scientist · PhonePe",
    location: "Bengaluru, IN",
    source: "indeed",
    handle: "indeed.com/r/imranq",
    skills: ["Python", "XGBoost", "SQL", "Airflow"],
    signal: "Real-time fraud scoring at 40ms p99 on UPI volume.",
    experience: 5,
    openToWork: true,
  },
  {
    id: "s8",
    name: "Meera Iyer",
    initials: "MI",
    headline: "Senior Product Designer · Zoho",
    location: "Chennai, IN",
    source: "wellfound",
    handle: "wellfound.com/u/meeraiyer",
    skills: ["Figma", "Design systems", "Prototyping", "User research"],
    signal: "Widely-read piece on designing information-dense tables.",
    experience: 6,
    openToWork: true,
  },
  {
    id: "s9",
    name: "Aarav Bhatia",
    initials: "AB",
    headline: "Design Systems Lead · Postman",
    location: "Bengaluru, IN",
    source: "wellfound",
    handle: "wellfound.com/u/aaravb",
    skills: ["Figma", "Design systems", "Prototyping"],
    signal: "Public design-token pipeline with visual regression tests.",
    experience: 7,
    openToWork: false,
  },
  {
    id: "s10",
    name: "Tanvi Shah",
    initials: "TS",
    headline: "Product Designer · Freelance",
    location: "Mumbai, IN",
    source: "linkedin",
    handle: "in/tanvishah",
    skills: ["Figma", "User research", "Prototyping"],
    signal: "Open to contract or full-time · immediate joiner.",
    experience: 4,
    openToWork: true,
  },
  {
    id: "s11",
    name: "Vikram Nair",
    initials: "VN",
    headline: "Backend Engineer II · CRED",
    location: "Bengaluru, IN",
    source: "stackoverflow",
    handle: "stackoverflow.com/users/vnair",
    skills: ["Go", "Kafka", "MySQL", "Redis"],
    signal: "Top 4% for the go and kafka tags.",
    experience: 5,
    openToWork: false,
  },
  {
    id: "s12",
    name: "Priya Raman",
    initials: "PR",
    headline: "SRE · Swiggy",
    location: "Bengaluru, IN",
    source: "stackoverflow",
    handle: "stackoverflow.com/users/priyar",
    skills: ["Kubernetes", "Terraform", "AWS", "Go"],
    signal: "3.1k reputation, mostly kubernetes and terraform answers.",
    experience: 6,
    openToWork: true,
  },
  {
    id: "s13",
    name: "Farhan Ali",
    initials: "FA",
    headline: "Full Stack Engineer · Groww",
    location: "Bengaluru, IN",
    source: "naukri",
    handle: "naukri.com/farhanali",
    skills: ["React", "TypeScript", "Go", "PostgreSQL"],
    signal: "Actively applying · updated this week.",
    experience: 4,
    openToWork: true,
  },
  {
    id: "s14",
    name: "Ritu Desai",
    initials: "RD",
    headline: "Data Analyst · Meesho",
    location: "Hyderabad, IN",
    source: "indeed",
    handle: "indeed.com/r/ritudesai",
    skills: ["SQL", "Tableau", "Python", "Airflow"],
    signal: "Owns the analytics layer for a 400-DAG pipeline.",
    experience: 5,
    openToWork: true,
  },
];

/** Ranks fictional profiles against a job's stack. Deterministic, no API. */
export function rankProfiles(profiles, job) {
  if (!job) return [];
  const wanted = new Set((job.stack || []).map((s) => s.toLowerCase()));

  return profiles
    .map((p) => {
      const matched = p.skills.filter((s) => wanted.has(s.toLowerCase()));
      const coverage = wanted.size ? matched.length / wanted.size : 0;
      // Weighted so overlap dominates, with a small nudge for availability.
      const score = Math.min(
        98,
        Math.round(coverage * 78 + Math.min(p.experience, 8) * 2.2 + (p.openToWork ? 5 : 0))
      );
      return { ...p, matched, score };
    })
    .filter((p) => p.matched.length > 0)
    .sort((a, b) => b.score - a.score);
}

// The fixed classification list. Shared by the Gemini prompt (server) and the
// summary screen (client), so the two can never drift apart.

export const ROLE_LABELS = [
  "Software Engineer",
  "Frontend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "DevOps Engineer",
  "ML Engineer",
  "Product Manager",
  "UI/UX Designer",
  "QA Engineer",
  "Other",
];

export const ROLE_TONES = {
  "Software Engineer": "primary",
  "Frontend Developer": "info",
  "Full Stack Developer": "violet",
  "Data Scientist": "success",
  "Data Analyst": "success",
  "DevOps Engineer": "warn",
  "ML Engineer": "violet",
  "Product Manager": "accent",
  "UI/UX Designer": "info",
  "QA Engineer": "warn",
  Other: "neutral",
};

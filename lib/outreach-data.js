// Status metadata for the Outreach → Email tab. Badges/tones only — the rows
// themselves come from real candidate data now (components/dashboard/EmailOutreachPanel.jsx
// derives them from useStore()), not from a fixed sample list.
//
// "Opened" / "Replied" aren't here: Resend delivery isn't tracked back into
// the app, so showing those would be inventing numbers. Only what's actually
// known — sent, and booked — is shown.

export const EMAIL_STATUSES = {
  sent: { label: "Sent", tone: "neutral" },
  scheduled: { label: "Interview Scheduled", tone: "violet" },
};

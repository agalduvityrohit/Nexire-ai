// Mock outreach data for the Email and Call dashboards.
//
// STRUCTURAL ONLY. No email is sent and no call is placed — these screens exist
// to settle the layout and the status model before Resend/SendGrid and Twilio
// are wired in. Replace this file with real queries at that point.

export const EMAIL_STATUSES = {
  sent: { label: "Sent", tone: "neutral" },
  opened: { label: "Opened", tone: "info" },
  replied: { label: "Replied", tone: "success" },
  scheduled: { label: "Interview Scheduled", tone: "violet" },
  none: { label: "No Response", tone: "warn" },
};

export const CALL_STATUSES = {
  not_called: { label: "Not Called", tone: "neutral" },
  no_answer: { label: "Called — No Answer", tone: "warn" },
  scheduled: { label: "Called — Scheduled", tone: "success" },
  declined: { label: "Called — Declined", tone: "danger" },
};

export const emailOutreach = [
  { id: "e1", name: "Ananya Menon", role: "Software Engineer", email: "ananya.menon@hey.com", status: "scheduled", updatedAt: "2026-08-08 16:40", subject: "Your AI interview for Senior Backend Engineer", opens: 4 },
  { id: "e2", name: "Karthik Rao", role: "ML Engineer", email: "karthik.rao@gmail.com", status: "replied", updatedAt: "2026-08-08 14:12", subject: "Next step — 25-minute interview with Arjun", opens: 3 },
  { id: "e3", name: "Sneha Kulkarni", role: "Software Engineer", email: "sneha.k@fastmail.com", status: "opened", updatedAt: "2026-08-08 11:02", subject: "Your AI interview for Senior Backend Engineer", opens: 2 },
  { id: "e4", name: "Meera Iyer", role: "UI/UX Designer", email: "meera.iyer@icloud.com", status: "scheduled", updatedAt: "2026-08-07 18:55", subject: "Booking your Product Designer screen", opens: 5 },
  { id: "e5", name: "Rohan Desai", role: "Full Stack Developer", email: "rohan.desai@gmail.com", status: "opened", updatedAt: "2026-08-07 15:20", subject: "Next step — 25-minute interview with Arjun", opens: 1 },
  { id: "e6", name: "Devika Rao", role: "DevOps Engineer", email: "devika@throttle.dev", status: "sent", updatedAt: "2026-08-07 09:30", subject: "We found your work on throttle-go", opens: 0 },
  { id: "e7", name: "Fatima Shaikh", role: "Data Analyst", email: "f.shaikh@proton.me", status: "none", updatedAt: "2026-08-04 10:15", subject: "Your application to Northwind Labs", opens: 0 },
  { id: "e8", name: "Vikram Nair", role: "Software Engineer", email: "vikram.nair@outlook.com", status: "sent", updatedAt: "2026-08-06 19:05", subject: "Your AI interview for Senior Backend Engineer", opens: 0 },
  { id: "e9", name: "Priyanka Joshi", role: "Data Scientist", email: "priyanka.joshi@live.com", status: "replied", updatedAt: "2026-08-06 13:48", subject: "Next step — 25-minute interview with Arjun", opens: 2 },
  { id: "e10", name: "Imran Qureshi", role: "ML Engineer", email: "imran.q@zoho.com", status: "none", updatedAt: "2026-08-02 08:22", subject: "Your application to Northwind Labs", opens: 0 },
  { id: "e11", name: "Aarav Bhatia", role: "UI/UX Designer", email: "aarav@tokenskit.dev", status: "opened", updatedAt: "2026-08-05 17:33", subject: "We found your design-systems work", opens: 1 },
  { id: "e12", name: "Nisha Verma", role: "QA Engineer", email: "nisha.verma@yahoo.com", status: "none", updatedAt: "2026-08-01 12:10", subject: "Your application to Northwind Labs", opens: 0 },
];

export const callOutreach = [
  { id: "c1", name: "Ananya Menon", role: "Software Engineer", phone: "+91 98450 12234", status: "scheduled", calledAt: "2026-08-08 17:05", notes: "Confirmed for the 29th, 11:00 IST. Asked for the role scorecard in advance." },
  { id: "c2", name: "Karthik Rao", role: "ML Engineer", phone: "+91 99860 41902", status: "scheduled", calledAt: "2026-08-08 15:20", notes: "Wants an evening slot — serving 60-day notice." },
  { id: "c3", name: "Sneha Kulkarni", role: "Software Engineer", phone: "+91 97650 33291", status: "no_answer", calledAt: "2026-08-08 12:40", notes: "Two attempts, no answer. Follow-up SMS sent." },
  { id: "c4", name: "Rohan Desai", role: "Full Stack Developer", phone: "+91 99201 55418", status: "no_answer", calledAt: "2026-08-07 16:10", notes: "Voicemail left." },
  { id: "c5", name: "Meera Iyer", role: "UI/UX Designer", phone: "+91 94440 87213", status: "scheduled", calledAt: "2026-08-07 19:30", notes: "Keen. Portfolio walkthrough booked alongside the AI screen." },
  { id: "c6", name: "Fatima Shaikh", role: "Data Analyst", phone: "+91 98111 78320", status: "declined", calledAt: "2026-08-05 11:00", notes: "Accepted another offer. Asked to stay in the pool." },
  { id: "c7", name: "Vikram Nair", role: "Software Engineer", phone: "+91 90080 44127", status: "not_called", calledAt: null, notes: "" },
  { id: "c8", name: "Devika Rao", role: "DevOps Engineer", phone: "+91 90045 21188", status: "not_called", calledAt: null, notes: "" },
  { id: "c9", name: "Priyanka Joshi", role: "Data Scientist", phone: "+91 97030 66214", status: "no_answer", calledAt: "2026-08-06 14:25", notes: "Ringing but no pickup — try after 6pm." },
  { id: "c10", name: "Imran Qureshi", role: "ML Engineer", phone: "+91 96320 18844", status: "not_called", calledAt: null, notes: "" },
];

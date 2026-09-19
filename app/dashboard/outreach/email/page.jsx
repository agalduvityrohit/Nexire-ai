import { redirect } from "next/navigation";

// Merged into the "Mail" tab on /dashboard/outreach — this just catches old links.
export default function EmailOutreachRedirect() {
  redirect("/dashboard/outreach");
}

import { redirect } from "next/navigation";

// Merged into the "Calls" tab on /dashboard/outreach — this just catches old links.
export default function CallOutreachRedirect() {
  redirect("/dashboard/outreach");
}

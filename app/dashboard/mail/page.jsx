import { redirect } from "next/navigation";

// Mail intake moved to the "Mail" tab on /dashboard/sourcing — it's a way of
// finding candidates, not reaching ones already in the pipeline. This just
// catches old links.
export default function MailRedirect() {
  redirect("/dashboard/sourcing");
}

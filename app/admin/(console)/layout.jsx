// Server gate for the whole admin console. Non-admins get a real 404 (see
// lib/server/adminGate.js); admins get the shared chrome.

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/server/adminGate";

export default async function AdminLayout({ children }) {
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}

// Server gate for the whole /admin tree. Non-admins get a real 404 (see
// lib/server/adminGate.js); admins get the shared chrome. Never indexed.

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/server/adminGate";

export const metadata = {
  title: "Admin — Nexire AI",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}

import { DashboardShell } from "@/components/dashboard/Shell";

export const metadata = {
  title: "Dashboard — Nexire AI",
};

export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}

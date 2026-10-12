// Shared by everything under /admin, including the public sign-in page. Never indexed.
// The access gate lives one level down, in app/admin/(console)/layout.jsx, so that
// /admin/login can render for people who aren't signed in yet.

export const metadata = {
  title: "Admin — Nexire AI",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return children;
}

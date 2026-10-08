import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/Toast";
import { AnalyticsClient } from "@/components/public/AnalyticsClient";
import { PageViewTracker } from "@/components/public/PageViewTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Nexire AI — AI-native hiring for teams that move",
  description:
    "Post a role, let AI screen and interview every applicant, and read a structured report instead of a résumé pile. UI prototype.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-canvas font-sans antialiased">
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
        <PageViewTracker />
        <AnalyticsClient />
      </body>
    </html>
  );
}

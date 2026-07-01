import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RegisterSW } from "@/components/providers/RegisterSW";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Offline-first household expense tracker",
  manifest: "/manifest.json",
  // Real financial data — never index.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Expenses" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main className="mx-auto min-h-screen max-w-md px-4">{children}</main>
          <NavBar />
          <RegisterSW />
        </AuthProvider>
      </body>
    </html>
  );
}

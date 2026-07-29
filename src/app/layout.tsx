import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RegisterSW } from "@/components/providers/RegisterSW";
import { NavBar } from "@/components/NavBar";
import { BRAND_COLOR } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Offline-first household expense tracker",
  manifest: "/manifest.json",
  // Real financial data — never index.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Expenses" },
};

// No `maximumScale`: pinning it to 1 blocks pinch-zoom and fails SC 1.4.4 Resize
// Text (AA). It was presumably there to stop iOS zooming on input focus, but the
// `input { font-size: 16px }` rule in globals.css already handles that on its own.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main className="mx-auto min-h-[100dvh] max-w-md px-4">{children}</main>
          <NavBar />
          <RegisterSW />
        </AuthProvider>
      </body>
    </html>
  );
}

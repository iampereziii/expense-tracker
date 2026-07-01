"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Log" },
  { href: "/periods", label: "Periods" },
  { href: "/categories", label: "Categories" },
  { href: "/report", label: "Report" },
] as const;

/** Fixed bottom nav — reachable one-handed on a phone. */
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`py-3 text-center text-xs font-medium ${
              active ? "text-brand" : "text-slate-400"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

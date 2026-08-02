"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Tab {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: ReactNode;
}

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const TABS: readonly Tab[] = [
  {
    href: "/",
    label: "Log",
    isActive: (p) => p === "/",
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  {
    href: "/periods",
    label: "Budget",
    isActive: (p) => p.startsWith("/periods"),
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Money",
    isActive: (p) => p.startsWith("/accounts") || p.startsWith("/savings"),
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M19 7V5H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 3v16a2 2 0 0 0 2 2h16V7H5" />
        <path d="M16 13h2" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "More",
    isActive: (p) =>
      p.startsWith("/more") || p.startsWith("/categories") || p.startsWith("/report"),
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

/** Fixed bottom nav — 4 tabs, icon + 11px label, soft pill behind the active icon. */
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active = t.isActive(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? "text-brand" : "text-ink-muted"
            }`}
          >
            <span
              className={`rounded-full px-4 py-0.5 transition-colors motion-reduce:transition-none ${
                active ? "bg-brand-soft" : ""
              }`}
            >
              {t.icon}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

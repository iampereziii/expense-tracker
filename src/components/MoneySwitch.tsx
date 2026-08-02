"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OPTIONS = [
  { href: "/accounts", label: "Accounts" },
  { href: "/savings", label: "Savings" },
] as const;

/** Segmented switch that makes two routes feel like one Money tab — no page merge. */
export function MoneySwitch() {
  const pathname = usePathname();
  return (
    <div className="flex rounded-full bg-surface-sunken p-1">
      {OPTIONS.map((o) => {
        const active = pathname.startsWith(o.href);
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full py-1.5 text-center text-sm transition-colors motion-reduce:transition-none ${
              active ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

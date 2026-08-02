"use client";

import { sanitizeAmountInput } from "@/lib/money";

interface AmountFieldProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}

/**
 * Sanitized PHP amount entry on the native decimal keyboard (ADR-0003) — the same
 * guard the expense input uses, shared so balances and pot transfers can't diverge from it.
 */
export function AmountField({
  value,
  onChange,
  placeholder = "0",
  label,
  className = "",
}: AmountFieldProps) {
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(sanitizeAmountInput(e.target.value))}
      className={`rounded-xl border border-line px-3 py-3 tabular-nums outline-none ${className}`}
    />
  );
}

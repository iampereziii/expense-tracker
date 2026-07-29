export const CURRENCY = "PHP";

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
});

/** Format a number as PHP currency, e.g. 1234.5 -> "₱1,234.50". */
export function formatPHP(amount: number): string {
  return phpFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Sanitize free-typed amount input (native keyboard) into a canonical raw string:
 * digits only, at most one decimal point, at most two decimal places. Mirrors the
 * guard the on-screen keypad used to enforce key-by-key (see ADR-0003).
 */
export function sanitizeAmountInput(raw: string): string {
  // Drop everything except digits and dots.
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) return cleaned;
  // Keep the first dot, drop any others, cap to two decimal places.
  const whole = cleaned.slice(0, dotIndex);
  const frac = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
  return whole + "." + frac;
}

/**
 * Parse raw amount input (digits, optional single decimal) into a number.
 * Returns 0 for empty/invalid input. Never throws — input must never block.
 */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

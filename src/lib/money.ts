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
 * Parse raw keypad input (digits, optional single decimal) into a number.
 * Returns 0 for empty/invalid input. Never throws — input must never block.
 */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

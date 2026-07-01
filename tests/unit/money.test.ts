import { describe, it, expect } from "vitest";
import { formatPHP, parseAmount } from "@/lib/money";

describe("money", () => {
  it("formats PHP with the peso sign and two decimals", () => {
    expect(formatPHP(1234.5)).toBe("₱1,234.50");
  });

  it("treats non-finite amounts as zero rather than throwing", () => {
    expect(formatPHP(Number.NaN)).toBe("₱0.00");
  });

  it("parses keypad input, ignoring stray characters", () => {
    expect(parseAmount("12.50")).toBe(12.5);
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });
});

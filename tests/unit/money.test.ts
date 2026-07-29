import { describe, it, expect } from "vitest";
import { formatPHP, parseAmount, sanitizeAmountInput } from "@/lib/money";

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

  describe("sanitizeAmountInput", () => {
    it("strips non-numeric characters", () => {
      expect(sanitizeAmountInput("1a2b3")).toBe("123");
    });

    it("keeps only the first decimal point", () => {
      expect(sanitizeAmountInput("1.2.3")).toBe("1.23");
    });

    it("caps to two decimal places", () => {
      expect(sanitizeAmountInput("12.999")).toBe("12.99");
    });

    it("leaves valid input untouched", () => {
      expect(sanitizeAmountInput("12.50")).toBe("12.50");
      expect(sanitizeAmountInput("100")).toBe("100");
      expect(sanitizeAmountInput("")).toBe("");
    });
  });
});

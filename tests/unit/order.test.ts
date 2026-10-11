import { describe, it, expect } from "vitest";
import { sortByCreatedAt } from "@/lib/order";

const at = (ms: number) => ({ toMillis: () => ms });

describe("sortByCreatedAt", () => {
  it("orders oldest first", () => {
    const sorted = sortByCreatedAt([
      { id: "b", createdAt: at(2) },
      { id: "a", createdAt: at(1) },
      { id: "c", createdAt: at(3) },
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("puts just-created items (pending timestamp) last", () => {
    const sorted = sortByCreatedAt([
      { id: "new", createdAt: null },
      { id: "old", createdAt: at(1) },
      { id: "missing" },
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["old", "new", "missing"]);
  });

  it("does not mutate the input", () => {
    const input = [{ id: "b", createdAt: at(2) }, { id: "a", createdAt: at(1) }];
    sortByCreatedAt(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

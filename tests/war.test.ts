import { describe, expect, it } from "vitest";
import { warMonths } from "@/lib/data/war";

describe("warMonths", () => {
  it("counts full months since 24.02.2022 grouped by year", () => {
    const g = warMonths("2022-02-24", "2026-10-24");
    expect(g).toEqual([
      { year: 2022, months: 10 },
      { year: 2023, months: 12 },
      { year: 2024, months: 12 },
      { year: 2025, months: 12 },
      { year: 2026, months: 10 },
    ]);
    expect(g.reduce((s, x) => s + x.months, 0)).toBe(56);
  });
  it("does not count an unfinished month", () => {
    expect(warMonths("2022-02-24", "2022-04-23").reduce((s, x) => s + x.months, 0)).toBe(1);
  });
});

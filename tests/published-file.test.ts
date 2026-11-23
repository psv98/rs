import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { parsePublishedFile, PUBLISHED_FORMAT } from "@/lib/data/published-file";
import { seedOct, confirmed, TODAY } from "./helpers";

const file = (snapshots: unknown[]) => ({ format: PUBLISHED_FORMAT, version: 1, snapshots });

describe("GitHub Pages data file", () => {
  it("the committed file is well-formed", () => {
    expect(() => parsePublishedFile(JSON.parse(fs.readFileSync("data/published/snapshots.json", "utf8")), TODAY)).not.toThrow();
  });
  it("leaves out snapshots without editor confirmation", () => {
    const r = parsePublishedFile(file([{ revision: 1, publishedAt: null, data: seedOct() }]), TODAY);
    expect(r.current).toBeNull();
    expect(r.skipped[0]?.asOfDate).toBe("2026-10-24");
  });
  it("publishes confirmed snapshots and strips internal notes", () => {
    const r = parsePublishedFile(file([{ revision: 1, publishedAt: null, data: confirmed(seedOct()) }]), TODAY);
    expect(r.current?.data.totalCrimes).toBe(989);
    expect(JSON.stringify(r)).not.toContain("internalNote");
  });
  it("holds back entries dated after today and keeps the current one live", () => {
    const now = confirmed(seedOct());
    const later = confirmed(seedOct());
    later.asOfDate = "2026-11-24";
    later.period = { start: "2026-10-24", end: "2026-11-24", newCases: null };
    const before = parsePublishedFile(file([{ revision: 1, publishedAt: null, data: now }, { revision: 1, publishedAt: null, data: later }]), "2026-11-23");
    expect(before.current?.data.asOfDate).toBe("2026-10-24");
    expect(before.scheduled).toEqual(["2026-11-24"]);
    expect(before.skipped).toEqual([]);
    const after = parsePublishedFile(file([{ revision: 1, publishedAt: null, data: now }, { revision: 1, publishedAt: null, data: later }]), "2026-11-24");
    expect(after.current?.data.asOfDate).toBe("2026-11-24");
    expect(after.scheduled).toEqual([]);
  });
  it("rejects malformed files and duplicates", () => {
    expect(() => parsePublishedFile({ format: "x" }, TODAY)).toThrow();
    const d = confirmed(seedOct());
    expect(() => parsePublishedFile(file([{ revision: 1, publishedAt: null, data: d }, { revision: 2, publishedAt: null, data: d }]), TODAY)).toThrow(/кілька/);
  });
});

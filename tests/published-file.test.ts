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
  it("rejects malformed files and duplicates", () => {
    expect(() => parsePublishedFile({ format: "x" }, TODAY)).toThrow();
    const d = confirmed(seedOct());
    expect(() => parsePublishedFile(file([{ revision: 1, publishedAt: null, data: d }, { revision: 2, publishedAt: null, data: d }]), TODAY)).toThrow(/кілька/);
  });
});

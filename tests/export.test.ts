import { describe, expect, it } from "vitest";
import { toPublicData } from "@/lib/data/schema";
import { planSlides, renderOg, renderSlide, renderZip } from "@/lib/export/render";
import { unzipSync } from "fflate";
import { seedOct } from "./helpers";

function pngSize(buf: Buffer) {
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe("PNG export", () => {
  const data = toPublicData(seedOct());

  it("plans an overview + 1 list slide for social and 1 wide slide for 14 categories", () => {
    expect(planSlides(data, "social").map((s) => s.categories.length)).toEqual([0, 14]);
    expect(planSlides(data, "wide").map((s) => s.categories.length)).toEqual([14]);
  });

  it("adds slides automatically when categories are added", () => {
    const more = { ...data, categories: [...data.categories, ...data.categories.map((c, i) => ({ ...c, id: `${c.id}-x`, order: 500 + i }))] };
    expect(planSlides(more, "social").length).toBe(3); // overview + 14 + 14
    expect(planSlides(more, "wide").length).toBe(2);
  });

  it.each(["uk", "en"] as const)("renders exact sizes (%s)", async (locale) => {
    expect(pngSize(await renderSlide(data, `t-${locale}`, "social", locale, 1))).toEqual({ w: 1080, h: 1350 });
    expect(pngSize(await renderSlide(data, `t-${locale}`, "social", locale, 2))).toEqual({ w: 1080, h: 1350 });
    expect(pngSize(await renderSlide(data, `t-${locale}`, "wide", locale, 1))).toEqual({ w: 1920, h: 1080 });
    expect(pngSize(await renderOg(data, `t-${locale}`, locale))).toEqual({ w: 1200, h: 630 });
  });

  it("zips every slide", async () => {
    const files = Object.keys(unzipSync(await renderZip(data, "zip", "uk", ["social", "wide"])));
    expect(files).toHaveLength(3);
    expect(files.every((f) => f.startsWith("imi-russias-crimes_2026-10-24_uk_"))).toBe(true);
  });
});

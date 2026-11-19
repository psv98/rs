import "server-only";
import { createElement } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { zipSync } from "fflate";
import type { Locale, PublicSnapshot } from "../data/schema";
import { exportFonts } from "./assets";
import { OgImage, SocialSlide, WideSlide } from "./templates";
import { planSlides, type ExportFormat } from "./plan";
export { planSlides, type ExportFormat };

type Data = PublicSnapshot["data"];

export const FORMATS: Record<ExportFormat | "og", { width: number; height: number }> = {
  social: { width: 1080, height: 1350 },
  wide: { width: 1920, height: 1080 },
  og: { width: 1200, height: 630 },
};

const cache = new Map<string, Buffer>();
const CACHE_MAX = 64;
function remember(key: string, png: Buffer) {
  cache.set(key, png);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return png;
}

async function toPng(element: React.ReactElement, width: number, height: number): Promise<Buffer> {
  const svg = await satori(element, { width, height, fonts: exportFonts() });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: false }, shapeRendering: 2, textRendering: 1 })
    .render()
    .asPng();
  return Buffer.from(png);
}

/** cacheKey must change whenever the data changes (we use the snapshot checksum). */
export async function renderSlide(data: Data, cacheKey: string, format: ExportFormat, locale: Locale, slide: number): Promise<Buffer> {
  const specs = planSlides(data, format);
  const spec = specs[slide - 1];
  if (!spec) throw new RangeError("slide out of range");
  const key = `${cacheKey}:${format}:${locale}:${slide}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { width, height } = FORMATS[format];
  const el = format === "social" ? createElement(SocialSlide, { locale, data, spec }) : createElement(WideSlide, { locale, data, spec });
  return remember(key, await toPng(el, width, height));
}

export async function renderOg(data: Data | null, cacheKey: string, locale: Locale): Promise<Buffer> {
  const key = `${cacheKey}:og:${locale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  return remember(key, await toPng(createElement(OgImage, { locale, data }), FORMATS.og.width, FORMATS.og.height));
}

export function fileName(data: Data, format: ExportFormat, locale: Locale, slide: number, count: number) {
  const size = `${FORMATS[format].width}x${FORMATS[format].height}`;
  return `imi-russias-crimes_${data.asOfDate}_${locale}_${size}${count > 1 ? `_${slide}-of-${count}` : ""}.png`;
}

/** ZIP with every slide of the given formats (PNG is already compressed → store). */
export async function renderZip(data: Data, cacheKey: string, locale: Locale, formats: ExportFormat[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  for (const f of formats) {
    const specs = planSlides(data, f);
    for (const s of specs) {
      files[fileName(data, f, locale, s.index, s.count)] = new Uint8Array(await renderSlide(data, cacheKey, f, locale, s.index));
    }
  }
  return zipSync(files, { level: 0 });
}

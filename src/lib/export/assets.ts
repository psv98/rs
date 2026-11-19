import "server-only";
import fs from "node:fs";
import path from "node:path";
import { CATEGORY_ICONS, CATEGORY_ICON_VIEWBOX, type CategoryIconId } from "../icons/category-icons.generated";
import type { Locale } from "../data/schema";

const root = process.cwd();
let fontsCache: Array<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }> | null = null;

/** Local, licensed font files (see assets/fonts/LICENSES.md). Never fetched from the network. */
export function exportFonts() {
  if (!fontsCache) {
    fontsCache = [
      { name: "Kyiv", data: fs.readFileSync(path.join(root, "assets/fonts/KyivTypeSans-Bold.ttf")), weight: 700, style: "normal" },
      { name: "Overpass", data: fs.readFileSync(path.join(root, "assets/fonts/Overpass-Medium.ttf")), weight: 500, style: "normal" },
    ];
  }
  return fontsCache;
}

const logoCache = new Map<Locale, { uri: string; width: number; height: number }>();

/** Official IMI logo for the language (white text variant for dark backgrounds). */
export function logoFor(locale: Locale) {
  let v = logoCache.get(locale);
  if (!v) {
    const svg = fs.readFileSync(path.join(root, `public/brand/imi-logo-${locale}.svg`), "utf8");
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    v = {
      uri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      width: m ? Number(m[1]) : 388,
      height: m ? Number(m[2]) : 139,
    };
    logoCache.set(locale, v);
  }
  return v;
}

const iconCache = new Map<string, string>();
export function iconUri(id: string, color: string): string {
  const k = `${id}:${color}`;
  let v = iconCache.get(k);
  if (!v) {
    const inner = CATEGORY_ICONS[id as CategoryIconId] ?? "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CATEGORY_ICON_VIEWBOX}" width="64" height="64" fill="none">${inner.replaceAll(
      "currentColor",
      color,
    )}</svg>`;
    v = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    iconCache.set(k, v);
  }
  return v;
}

/**
 * Pre-renders every PNG (and ZIP) for the static site from data/published/snapshots.json
 * into public/exports/<lang>/ — the static counterpart of /api/export.
 */
import fs from "node:fs";
import path from "node:path";
import { loadPublishedFile } from "../src/lib/data/published-file";
import { planSlides, renderOg, renderSlide, renderZip, fileName } from "../src/lib/export/render";

(async () => {
  const { current } = loadPublishedFile();
  const out = path.resolve("public/exports");
  fs.rmSync(out, { recursive: true, force: true });
  if (!current) {
    console.log("No published snapshot — nothing to render.");
    return;
  }
  const manifest: Record<string, unknown> = { asOfDate: current.data.asOfDate, checksum: current.checksum, files: {} };
  for (const locale of ["uk", "en"] as const) {
    const dir = path.join(out, locale);
    fs.mkdirSync(dir, { recursive: true });
    const files: Record<string, string> = {};
    for (const format of ["social", "wide"] as const) {
      for (const s of planSlides(current.data, format)) {
        const name = `${format}-${s.index}.png`;
        fs.writeFileSync(path.join(dir, name), await renderSlide(current.data, current.checksum, format, locale, s.index));
        files[name] = fileName(current.data, format, locale, s.index, s.count);
      }
    }
    fs.writeFileSync(path.join(dir, "og.png"), await renderOg(current.data, current.checksum, locale));
    fs.writeFileSync(path.join(dir, "slides-1080x1350.zip"), await renderZip(current.data, current.checksum, locale, ["social"]));
    fs.writeFileSync(path.join(dir, "all-slides.zip"), await renderZip(current.data, current.checksum, locale, ["social", "wide"]));
    (manifest.files as Record<string, unknown>)[locale] = files;
    console.log(`✓ ${locale}: ${Object.keys(files).length} slides, og.png, 2 zip`);
  }
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
})().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});

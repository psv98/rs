# Category icons

The 14 category icons were extracted from the IMI infographic
`4 роки і 8 місяців повномасштабної війни` (SVG, 1800 × 3215 px) — not redrawn.

Pipeline (Python 3, `pip install lxml svgelements`):

1. `bbox.py <infographic.svg>` lists the top-level elements with bounding boxes so they can be matched to table cells.
2. `extract_icons.py <infographic.svg> <raw_dir>` copies the icon elements (plus the `clipPath`/`mask` definitions they use) into one SVG per category. The element indices are mapped in the `ICONS` dict.
3. `normalize_icons.py <raw_dir> public/icons/categories` turns them into clean icons:
   - every icon is fitted into the same `0 0 64 64` box with a 4 px optical margin;
   - grey `#8B8B8B` fills become `currentColor`, so the icon follows the text colour;
   - Figma "inner stroke" artefacts (dark masked strokes) are removed;
   - background-coloured knock-out shapes (for example the lock in the laptop) become real SVG masks, so the icons work on any background;
   - flag colours in the "broadcast takeover" icon become tonal steps of `currentColor`, so the icon set stays monochrome;
   - ids are prefixed per icon, so several icons can be inlined on one page.
4. `node scripts/icons/build-icons.mjs` validates the SVGs against an element/attribute allowlist and regenerates `src/lib/icons/category-icons.generated.ts`.

The infographic SVG itself (12 MB with embedded raster images) is not committed.
Keep it in your local design archive if you want to re-run the extraction.

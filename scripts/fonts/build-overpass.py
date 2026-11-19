"""Overpass with balanced vertical metrics (SIL OFL 1.1, no reserved font name).

The stock fonts put the ascent at 0.883 em and the descent at 0.383 em, so text sits
visibly high inside buttons, pills and menu items in every browser that ignores the CSS
ascent-override descriptor (Safari). This script rewrites hhea/OS2 so the line box is
centred on the letters, renames the family to "Overpass IMI", and writes WOFF2 files to
src/app/fonts/overpass/. Run: pip install fonttools brotli && python3 scripts/fonts/build-overpass.py
"""
import pathlib
from fontTools.ttLib import TTFont

SRC = pathlib.Path("node_modules/@fontsource/overpass/files")
OUT = pathlib.Path("src/app/fonts/overpass")
OUT.mkdir(parents=True, exist_ok=True)
ASC, DESC = 1970, 570  # units per em = 2000: cap height (1400) centred in the line box

for weight in (400, 500, 600, 700):
    for subset in ("cyrillic-ext", "cyrillic", "latin-ext", "latin"):
        f = TTFont(SRC / f"overpass-{subset}-{weight}-normal.woff2")
        f["hhea"].ascent, f["hhea"].descent, f["hhea"].lineGap = ASC, -DESC, 0
        os2 = f["OS/2"]
        os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ASC, -DESC, 0
        for rec in f["name"].names:
            if rec.nameID in (1, 4, 16):
                rec.string = str(rec.toUnicode()).replace("Overpass", "Overpass IMI")
            if rec.nameID == 6:
                rec.string = str(rec.toUnicode()).replace("Overpass", "OverpassIMI")
        f.flavor = "woff2"
        f.save(OUT / f"overpass-imi-{subset}-{weight}.woff2")
print("ok")

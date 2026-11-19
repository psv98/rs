/* PNG templates rendered with Satori (flexbox subset of CSS). Built from blocks, like the
   category cards on the site: a headline block with the total, stat blocks, one block per
   category. Each format is composed for its own size; the IMI logo is part of every image. */
import type { ReactNode } from "react";
import { visibleCategories, type Category, type Locale, type PublicSnapshot } from "../data/schema";
import { formatLongDate, formatShortDate } from "../data/dates";
import { t } from "../i18n/dictionaries";
import { groupDigits } from "../viz/geometry";
import { iconUri, logoFor } from "./assets";
import type { SlideSpec } from "./plan";

export const C = {
  bg: "#0B0B11",
  panel: "#14141A",
  line: "#2A2A36",
  lineStrong: "#333344",
  red: "#ED4C5C",
  pink: "#FF8A96",
  deep: "#A81D30",
  text: "#F9F9F9",
  text2: "#ADADAD",
  muted: "#8B8B8B",
  ember: "#F29A3C",
};

type Data = PublicSnapshot["data"];
const nb = (s: string) => s.replace(/(\d) /g, "$1 ");
const num = (n: number) => groupDigits(n).replace(/ /g, " ");

function Frame({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: C.bg,
        backgroundImage: `radial-gradient(circle at 92% 8%, rgba(237,76,92,0.26) 0%, rgba(237,76,92,0) 40%), radial-gradient(circle at 0% 100%, rgba(168,29,48,0.30) 0%, rgba(168,29,48,0) 48%)`,
        color: C.text,
        fontFamily: "Overpass",
      }}
    >
      {children}
    </div>
  );
}

function Logo({ locale, height }: { locale: Locale; height: number }) {
  const l = logoFor(locale);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={l.uri} width={Math.round((l.width / l.height) * height)} height={height} alt="" />;
}

const BLOCK = {
  display: "flex",
  boxSizing: "border-box",
  borderRadius: 22,
  border: `1.5px solid ${C.lineStrong}`,
  backgroundColor: "rgba(20,20,26,0.92)",
} as const;

/** Rough width of a run of Kyiv Type Sans digits, used to size numbers so they always fit. */
const numWidth = (text: string, fs: number) => [...text].reduce((w, ch) => w + (/\d/.test(ch) ? 0.62 : 0.28), 0) * fs;
const fitNumber = (text: string, room: number, max: number) => Math.min(max, Math.floor(max * (room / Math.max(room, numWidth(text, max)))));

/** The project title on two fixed lines, sized so the longer line fills the width. */
function Title({ locale, size, width, wrap = false, center = false }: { locale: Locale; size: number; width: number; wrap?: boolean; center?: boolean }) {
  if (wrap)
    return (
      <div style={{ display: "flex", flexWrap: "wrap", width, fontFamily: "Kyiv", fontSize: size, lineHeight: 1.06, letterSpacing: -size * 0.012 }}>
        {t(locale)
          .hero.titleParts.map((part, i) => part.trim().split(" ").map((w) => [w, i === 1] as const))
          .flat()
          .map(([w, red], j) => (
            <span key={j} style={{ color: red ? "#FF5A6A" : C.text, marginRight: size * 0.26 }}>
              {w}
            </span>
          ))}
      </div>
    );
  const lines = t(locale).exportText.titleLines;
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = Math.min(size, Math.floor(width / (longest * 0.56)));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", width, fontFamily: "Kyiv", fontSize: fs, lineHeight: 1.06, letterSpacing: -fs * 0.012 }}>
      {lines.map((l, i) => {
        // Same accent as the site headline: "журналістів і медіа" in red.
        const accent = t(locale).hero.titleParts[1];
        const full = lines.join(" ");
        const at = full.indexOf(accent);
        const start = lines.slice(0, i).join(" ").length + (i > 0 ? 1 : 0);
        const from = Math.max(0, at - start);
        const to = Math.min(l.length, at + accent.length - start);
        const parts = at < 0 || to <= 0 || from >= l.length ? [[l, false]] : [[l.slice(0, from), false], [l.slice(from, to), true], [l.slice(to), false]];
        return (
          <div key={l} style={{ display: "flex", whiteSpace: "pre" }}>
            {(parts as Array<[string, boolean]>)
              .filter(([x]) => x)
              .map(([x, red], j) => (
                <span key={j} style={{ color: red ? "#FF5A6A" : C.text }}>
                  {x}
                </span>
              ))}
          </div>
        );
      })}
    </div>
  );
}

/** War duration as a single line with fading rules (no per-month marks). */
function WarLine({ data, locale, size = 1, center = false }: { data: Data; locale: Locale; size?: number; center?: boolean }) {
  const rule = (dir: "l" | "r") => (
    <div
      style={{
        display: "flex",
        width: 64 * size,
        height: 2,
        backgroundImage: `linear-gradient(${dir === "l" ? "90deg" : "270deg"}, rgba(237,76,92,0), ${C.red})`,
      }}
    />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: center ? "center" : "flex-start", gap: 18 * size }}>
      {rule("l")}
      <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 30 * size, color: "#FF9AA4" }}>{data.texts.periodLabel[locale]}</div>
      {center && rule("r")}
    </div>
  );
}

/** The headline block: the total, the word under it, the period, then new cases. */
function TotalBlock({ data, locale, width, height, max, center = false }: { data: Data; locale: Locale; width: number; height: number; max: number; center?: boolean }) {
  const d = t(locale);
  const text = num(data.totalCrimes);
  const pad = Math.round(Math.min(height * 0.1, 52));
  const fs = fitNumber(text, width - pad * 2, max);
  const side = Math.round(Math.max(18, max * 0.11));
  const p = data.period;
  const fresh = p.newCases !== null && p.start && p.end ? { v: `+${num(p.newCases)}`, l: d.hero.statNew(formatShortDate(p.start), formatShortDate(p.end)) } : null;
  const align = center ? "center" : "flex-start";
  return (
    <div
      style={{
        ...BLOCK,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align,
        width,
        height,
        padding: `0 ${pad}px`,
        textAlign: center ? "center" : "left",
        border: "1.5px solid rgba(237,76,92,0.45)",
        backgroundImage: center
          ? "radial-gradient(circle at 50% 35%, rgba(237,76,92,0.30) 0%, rgba(20,20,26,0.95) 62%)"
          : "linear-gradient(135deg, rgba(168,29,48,0.45), rgba(20,20,26,0.95) 62%)",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: fs, lineHeight: 0.9, letterSpacing: -fs * 0.03, color: "#FF6F7D", paddingTop: fs * 0.06 }}>{text}</div>
      <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: Math.round(max * 0.2), lineHeight: 1.1, marginTop: max * 0.05 }}>{d.hero.crimesWord(data.totalCrimes)}</div>
      <div style={{ display: "flex", justifyContent: align, fontSize: side, color: C.text2, lineHeight: 1.35, marginTop: side * 0.7, maxWidth: width - pad * 2 }}>
        {nb(d.exportText.crimesBetween(formatLongDate(data.monitoringStart, locale), formatLongDate(data.asOfDate, locale)).replace(/^\S+\s/, ""))}
      </div>
      {fresh && (
        <div style={{ display: "flex", alignItems: "center", gap: side * 0.7, marginTop: side * 1.1, paddingTop: side * 0.9, borderTop: `1.5px solid ${C.lineStrong}` }}>
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: side * 1.6, lineHeight: 1, color: C.ember }}>{fresh.v}</div>
          <div style={{ display: "flex", fontSize: side * 0.85, color: C.text2 }}>{fresh.l}</div>
        </div>
      )}
    </div>
  );
}

/** One category as a block: icon, number, name — the same card as on the site.
 *  "row": icon | number | name (wide blocks); "stack": number above the name (narrow blocks). */
function CatBlock({
  c,
  locale,
  w,
  h,
  scale = 1,
  killedTotal,
  layout,
  numCol,
}: {
  c: Category;
  locale: Locale;
  w: number;
  h: number;
  scale?: number;
  killedTotal?: number | null;
  layout: "row" | "stack";
  numCol: number;
}) {
  const name = c.name[locale];
  const pad = 18 * scale;
  const gap = 16 * scale;
  const icon = Math.round(Math.min(52 * scale, h * 0.42));
  const numFs = 42 * scale;
  const value = num(c.value);
  const sup = killedTotal != null && c.id === "killings" ? `(${num(killedTotal)})*` : null;
  const room = w - pad * 2 - icon - gap - (layout === "row" ? numCol + gap : 0);
  // Two lines for most names, three for the longest; shrink a little rather than cut.
  const lines = name.length * 0.52 * 20 * scale > room * 2 ? 3 : 2;
  const nameSize = Math.max(15, Math.min(20 * scale, (room * lines) / (name.length * 0.52)));
  const number = (
    <div style={{ display: "flex", flexDirection: layout === "row" ? "column" : "row", alignItems: layout === "row" ? "flex-start" : "flex-start", width: layout === "row" ? numCol : undefined }}>
      <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: numFs, lineHeight: 1, color: C.red }}>{value}</div>
      {sup && <div style={{ display: "flex", fontSize: 17 * scale, color: C.pink, marginLeft: layout === "row" ? 0 : 6, marginTop: layout === "row" ? 4 : 0 }}>{sup}</div>}
    </div>
  );
  return (
    <div style={{ ...BLOCK, width: w, height: h, padding: `0 ${pad}px`, alignItems: "center", gap, borderRadius: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconUri(c.iconId, "#CFCFCF")} width={icon} height={icon} alt="" />
      {layout === "row" ? (
        <>
          {number}
          <div style={{ display: "flex", width: room, fontSize: nameSize, lineHeight: 1.2, color: C.text }}>{name}</div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", width: room, gap: 6 * scale }}>
          {number}
          <div style={{ display: "flex", fontSize: nameSize, lineHeight: 1.18, color: C.text }}>{name}</div>
        </div>
      )}
    </div>
  );
}

function CatGrid({
  cats,
  data,
  locale,
  width,
  height,
  cols,
  gap = 12,
  scale = 1,
  note,
  layout = "stack",
}: {
  cats: Category[];
  data: Data;
  locale: Locale;
  width: number;
  height: number;
  cols: number;
  gap?: number;
  scale?: number;
  note?: string | null;
  layout?: "row" | "stack";
}) {
  const cells = cats.length + (note ? 1 : 0);
  const rows = Math.max(1, Math.ceil(cells / cols));
  const w = (width - gap * (cols - 1)) / cols;
  const h = Math.min(170 * scale, (height - gap * (rows - 1)) / rows);
  const rowEls = Array.from({ length: rows }, (_, r) => r);
  const numCol = Math.ceil(Math.max(...cats.map((c) => numWidth(num(c.value), 42 * scale))));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, width }}>
      {rowEls.map((r) => (
        <div key={r} style={{ display: "flex", gap }}>
          {Array.from({ length: cols }, (_, ci) => {
            const i = r * cols + ci;
            const c = cats[i];
            if (c) return <CatBlock key={c.id} c={c} locale={locale} w={w} h={h} scale={scale} killedTotal={data.casualties.killedTotal} layout={layout} numCol={numCol} />;
            if (note && i === cats.length)
              return (
                <div key="note" style={{ ...BLOCK, width: w, height: h, padding: 20 * scale, alignItems: "center", borderRadius: 18, borderStyle: "dashed", backgroundColor: "rgba(20,20,26,0.5)" }}>
                  <div style={{ display: "flex", fontSize: 17 * scale, lineHeight: 1.3, color: C.text2 }}>{note}</div>
                </div>
              );
            return <div key={`e${i}`} style={{ display: "flex", width: w, height: h }} />;
          })}
        </div>
      ))}
    </div>
  );
}

function Footer({ locale, data, size = 1, width }: { locale: Locale; data: Data; size?: number; width?: number }) {
  const d = t(locale).exportText;
  return (
    <div style={{ display: "flex", width, justifyContent: "space-between", alignItems: "flex-end", gap: 24, fontSize: 19 * size, color: C.muted, lineHeight: 1.35 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", color: C.text2 }}>{d.source}</div>
        <div style={{ display: "flex" }}>{nb(d.asOf(formatLongDate(data.asOfDate, locale)))}</div>
      </div>
      <div style={{ display: "flex", color: C.text2 }}>imi.org.ua/russias-crimes</div>
    </div>
  );
}

function killedLine(locale: Locale, data: Data): string | null {
  const { killedTotal, killedOnDuty } = data.casualties;
  if (killedTotal === null) return null;
  return `* ${t(locale).categories.killedFootnote(killedTotal, killedOnDuty)}`;
}

/* ------------------------------------------------------------------ social 1080×1350 */

export function SocialSlide({ locale, data, spec }: { locale: Locale; data: Data; spec: SlideSpec }) {
  const W = 1080;
  const H = 1350;
  const P = 72;
  const inner = W - 2 * P;
  const d = t(locale);
  if (spec.index === 1) {
    return (
      <Frame w={W} h={H}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: P, width: W, height: H, boxSizing: "border-box" }}>
          <Logo locale={locale} height={76} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
            <Title locale={locale} size={70} width={inner} center />
            <WarLine data={data} locale={locale} center />
          </div>
          <TotalBlock data={data} locale={locale} width={inner} height={640} max={270} center />
          <Footer locale={locale} data={data} width={inner} />
        </div>
      </Frame>
    );
  }
  const hasKilled = spec.categories.some((c) => c.id === "killings");
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: P, width: W, height: H, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo locale={locale} height={64} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 60, lineHeight: 1.04 }}>{spec.index > 2 ? `${d.exportText.typesTitle} (${d.exportText.continued.toLowerCase()})` : d.exportText.typesTitle}</div>
          <div style={{ display: "flex", fontSize: 22, color: C.text2 }}>{nb(d.hero.asOf(formatLongDate(data.asOfDate, locale)))}</div>
        </div>
        <CatGrid cats={spec.categories} data={data} locale={locale} width={inner} height={830} cols={2} gap={12} scale={1} layout="row" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {hasKilled && <div style={{ display: "flex", fontSize: 18, color: C.text2, lineHeight: 1.35 }}>{killedLine(locale, data)}</div>}
          <Footer locale={locale} data={data} />
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ wide 1920×1080 */

export function WideSlide({ locale, data, spec }: { locale: Locale; data: Data; spec: SlideSpec }) {
  const W = 1920;
  const H = 1080;
  const P = 72;
  const leftW = 660;
  const gap = 64;
  const rightW = W - 2 * P - leftW - gap;
  const d = t(locale);
  const hasKilled = spec.categories.some((c) => c.id === "killings");
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", padding: P, width: W, height: H, gap, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: leftW }}>
          <Logo locale={locale} height={58} />
          <Title locale={locale} size={56} width={leftW} wrap />
          <WarLine data={data} locale={locale} size={0.8} />
          <TotalBlock data={data} locale={locale} width={leftW} height={420} max={180} />
          <Footer locale={locale} data={data} size={0.85} width={leftW} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: rightW }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 58 }}>
            <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 40, lineHeight: 1 }}>{d.exportText.typesTitle}</div>
            {spec.count > 1 && <div style={{ display: "flex", fontSize: 20, color: C.text2 }}>{`${spec.index} / ${spec.count}`}</div>}
          </div>
          <CatGrid cats={spec.categories} data={data} locale={locale} width={rightW} height={H - 2 * P - 58 - 28} cols={3} gap={12} scale={0.9} note={hasKilled ? killedLine(locale, data) : null} />
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ Open Graph 1200×630 */

export function OgImage({ locale, data }: { locale: Locale; data: Data | null }) {
  const W = 1200;
  const H = 630;
  const P = 56;
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: P, width: W, height: H, boxSizing: "border-box" }}>
        <Logo locale={locale} height={56} />
        <Title locale={locale} size={62} width={W - 2 * P} />
        {data ? <TotalBlock data={data} locale={locale} width={W - 2 * P} height={250} max={150} /> : <div style={{ display: "flex", fontSize: 24, color: C.text2 }}>imi.org.ua</div>}
      </div>
    </Frame>
  );
}

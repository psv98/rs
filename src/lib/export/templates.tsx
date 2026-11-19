/* PNG templates rendered with Satori (flexbox subset of CSS). Each slide is designed
   for its format — nothing here is a scaled-down screenshot of the web page. */
import type { ReactElement, ReactNode } from "react";
import type { Category, Locale, PublicSnapshot } from "../data/schema";
import { formatLongDate, formatShortDate } from "../data/dates";
import { t } from "../i18n/dictionaries";
import { iconUri, logoFor } from "./assets";

export const C = {
  bg: "#0B0B11",
  panel: "#14141A",
  panel2: "#17171F",
  line: "#2A2A36",
  lineStrong: "#333344",
  red: "#ED4C5C",
  red2: "#D33F53",
  deep: "#A81D30",
  text: "#F9F9F9",
  text2: "#ADADAD",
  muted: "#8B8B8B",
};

type Data = PublicSnapshot["data"];

import type { SlideSpec } from "./plan";

/** Keep "24 жовтня" / "2026 року" together on one line. */
const nb = (s: string) => s.replace(/(\d) /g, "$1\u00a0");

function Dot() {
  return <div style={{ display: "flex", width: 6, height: 6, borderRadius: 3, backgroundColor: C.red, margin: "0 12px", alignSelf: "center" }} />;
}

const fmt = (n: number, locale: Locale) => n.toLocaleString(locale === "uk" ? "uk-UA" : "en-GB").replace(/ /g, " ");

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
        backgroundImage: `radial-gradient(circle at 0% 0%, rgba(168,29,48,0.42) 0%, rgba(168,29,48,0) 46%), radial-gradient(circle at 100% 100%, rgba(237,76,92,0.14) 0%, rgba(237,76,92,0) 40%)`,
        color: C.text,
        fontFamily: "Overpass",
      }}
    >
      {/* hairline grid */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: w,
          height: h,
          display: "flex",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {children}
    </div>
  );
}

function Logo({ locale, height }: { locale: Locale; height: number }) {
  const l = logoFor(locale);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={l.uri} width={Math.round((l.width / l.height) * height)} height={height} alt="" />;
}

function Kicker({ children, size = 22, color = C.red }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", fontSize: size, letterSpacing: size * 0.14, color, textTransform: "uppercase" }}>
      <div style={{ display: "flex", width: size * 0.9, height: 3, backgroundColor: C.red, marginRight: size * 0.6 }} />
      {children}
    </div>
  );
}

function TopBar({ locale, spec, data, logoH }: { locale: Locale; spec: SlideSpec; data: Data; logoH: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Logo locale={locale} height={logoH} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 20, color: C.text2, letterSpacing: 2 }}>
        <div style={{ display: "flex" }}>{formatShortDate(data.asOfDate)}</div>
        {spec.count > 1 && (
          <div style={{ display: "flex", color: C.red, marginTop: 6 }}>
            {`${String(spec.index).padStart(2, "0")} / ${String(spec.count).padStart(2, "0")}`}
          </div>
        )}
      </div>
    </div>
  );
}

/** Font size steps so long category names never overflow their cell. */
function nameSize(name: string, base: number) {
  if (name.length > 64) return Math.round(base * 0.78);
  if (name.length > 44) return Math.round(base * 0.86);
  return base;
}

function CategoryCell({
  c,
  locale,
  w,
  h,
  iconSize,
  valueSize,
  labelSize,
  killedTotal,
}: {
  c: Category;
  locale: Locale;
  w: number;
  h: number;
  iconSize: number;
  valueSize: number;
  labelSize: number;
  killedTotal?: number | null;
}) {
  const name = c.name[locale];
  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: Math.round(h * 0.12),
        boxSizing: "border-box",
        backgroundColor: "rgba(20,20,26,0.92)",
        border: `1.5px solid ${C.lineStrong}`,
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUri(c.iconId, C.text2)} width={iconSize} height={iconSize} alt="" />
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: valueSize, lineHeight: 1, color: C.red, letterSpacing: -1 }}>{fmt(c.value, locale)}</div>
          {killedTotal != null && c.id === "killings" && (
            <div style={{ display: "flex", fontSize: Math.round(valueSize * 0.34), color: C.red, marginLeft: 6, marginTop: -2 }}>{`(${killedTotal})*`}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: nameSize(name, labelSize), lineHeight: 1.18, color: C.text }}>{name}</div>
    </div>
  );
}

function Grid({
  items,
  cols,
  gap,
  render,
  tail,
}: {
  items: Category[];
  cols: number;
  gap: number;
  render: (c: Category) => ReactElement;
  tail?: ReactElement | null;
}) {
  const rows: Category[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap }}>
          {r.map((c) => (
            <div key={c.id} style={{ display: "flex" }}>
              {render(c)}
            </div>
          ))}
          {i === rows.length - 1 && tail}
        </div>
      ))}
    </div>
  );
}

function NoteCell({ w, h, text, locale }: { w: number; h: number; text: string | null; locale: Locale }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: Math.round(h * 0.12),
        boxSizing: "border-box",
        border: `1.5px dashed ${C.lineStrong}`,
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", fontSize: 18, color: C.text2, lineHeight: 1.35 }}>{text ?? ""}</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 17, color: C.muted, lineHeight: 1.35 }}>
        <div style={{ display: "flex" }}>{locale === "uk" ? "Реєстр випадків:" : "Case registry:"}</div>
        <div style={{ display: "flex", color: C.text2 }}>imi.org.ua/russias-crimes</div>
      </div>
    </div>
  );
}

function SourceLine({ locale, data, size = 20 }: { locale: Locale; data: Data; size?: number }) {
  const d = t(locale).exportText;
  return (
    <div style={{ display: "flex", flexDirection: "column", fontSize: size, color: C.muted, lineHeight: 1.35 }}>
      <div style={{ display: "flex" }}>
        {d.source}
        <Dot />
        imi.org.ua
      </div>
      <div style={{ display: "flex" }}>{nb(d.asOf(formatLongDate(data.asOfDate, locale)))}</div>
    </div>
  );
}

function killedLine(locale: Locale, data: Data): string | null {
  const { killedTotal, killedOnDuty } = data.casualties;
  if (killedTotal === null) return null;
  return `* ${t(locale).categories.killedFootnote(killedTotal, killedOnDuty)}`;
}

function StatChip({ value, label, w }: { value: string; label: string; w: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: w, padding: "18px 22px", boxSizing: "border-box", border: `1.5px solid ${C.lineStrong}`, borderRadius: 14, backgroundColor: "rgba(20,20,26,0.85)" }}>
      <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 44, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 19, color: C.text2, marginTop: 8, lineHeight: 1.25 }}>{label}</div>
    </div>
  );
}

function heroChips(locale: Locale, data: Data) {
  const chips: Array<{ value: string; label: string }> = [];
  const p = data.period;
  if (p.newCases !== null && p.start && p.end) {
    chips.push({
      value: `+${p.newCases}`,
      label: locale === "uk" ? `нових випадків ${formatShortDate(p.start)}–${formatShortDate(p.end)}` : `new cases ${formatShortDate(p.start)}–${formatShortDate(p.end)}`,
    });
  }
  const k = data.casualties;
  if (k.killedTotal !== null) {
    chips.push({
      value: fmt(k.killedTotal, locale),
      label:
        locale === "uk"
          ? `загиблих медійників${k.killedOnDuty !== null ? `, ${k.killedOnDuty} — під час роботи` : ""}`
          : `media workers killed${k.killedOnDuty !== null ? `, ${k.killedOnDuty} while reporting` : ""}`,
    });
  }
  return chips;
}

/* ------------------------------------------------------------------ social 1080×1350 */

export function SocialSlide({ locale, data, spec }: { locale: Locale; data: Data; spec: SlideSpec }) {
  const W = 1080;
  const H = 1350;
  const P = 64;
  const d = t(locale);
  const inner = W - 2 * P;
  const first = spec.index === 1;
  // Slide 1 shows casualties in a chip; elsewhere the killings cell gets the (N)* footnote.
  const hasKillings = !first && spec.categories.some((c) => c.id === "killings");
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", flexDirection: "column", padding: P, width: W, height: H, boxSizing: "border-box", justifyContent: "space-between" }}>
        <TopBar locale={locale} spec={spec} data={data} logoH={58} />
        {first ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Kicker size={21}>{data.texts.periodLabel[locale]}</Kicker>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Kyiv", fontSize: locale === "uk" ? 54 : 46, lineHeight: 1.06, marginTop: 22, letterSpacing: -0.5 }}>
              {(locale === "uk" ? ["Злочини Росії проти медіа", "та журналістів в Україні"] : ["Russia's crimes against journalists", "and the media in Ukraine"]).map((l) => (
                <div key={l} style={{ display: "flex" }}>{l}</div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 18 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Kyiv",
                  fontSize: 270,
                  lineHeight: 0.86,
                  letterSpacing: -10,
                  color: C.red,
                  textShadow: "0 0 60px rgba(237,76,92,0.45)",
                }}
              >
                {fmt(data.totalCrimes, locale)}
              </div>
            </div>
            <div style={{ display: "flex", width: inner, height: 3, backgroundImage: `linear-gradient(90deg, ${C.red} 0%, ${C.deep} 45%, rgba(168,29,48,0) 100%)`, marginTop: 18 }} />
            <div style={{ display: "flex", fontSize: 26, color: C.text2, marginTop: 16, lineHeight: 1.3 }}>
              {nb(d.exportText.crimesBetween(formatLongDate(data.monitoringStart, locale, false), formatLongDate(data.asOfDate, locale)))}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 26 }}>
              {heroChips(locale, data).map((c) => (
                <StatChip key={c.label} value={c.value} label={c.label} w={(inner - 18) / 2} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Kicker size={21}>{data.texts.periodLabel[locale]}</Kicker>
            <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 58, lineHeight: 1.05, marginTop: 20 }}>{d.exportText.typesTitle}</div>
            <div style={{ display: "flex", fontSize: 22, color: C.text2, marginTop: 10 }}>
              {d.exportText.continued}
              <Dot />
              {`${fmt(data.totalCrimes, locale)} ${locale === "uk" ? "злочинів станом на" : "crimes as of"} ${formatShortDate(data.asOfDate)}`}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {first && (
            <div style={{ display: "flex", marginBottom: 16 }}>
              <Kicker size={19} color={C.text2}>{d.exportText.typesTitle}</Kicker>
            </div>
          )}
          <Grid
            items={spec.categories}
            cols={first ? 3 : 2}
            gap={14}
            render={(c) =>
              first ? (
                <CategoryCell c={c} locale={locale} w={(inner - 28) / 3} h={150} iconSize={44} valueSize={50} labelSize={20} />
              ) : (
                <CategoryCell c={c} locale={locale} w={(inner - 14) / 2} h={168} iconSize={54} valueSize={66} labelSize={23} killedTotal={hasKillings ? data.casualties.killedTotal : null} />
              )
            }
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1.5px solid ${C.lineStrong}`, paddingTop: 18 }}>
          <SourceLine locale={locale} data={data} size={19} />
          {hasKillings && killedLine(locale, data) ? (
            <div style={{ display: "flex", width: 470, fontSize: 17, color: C.muted, lineHeight: 1.3, textAlign: "right", justifyContent: "flex-end" }}>
              {killedLine(locale, data)}
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 19, color: C.muted }}>imi.org.ua/russias-crimes</div>
          )}
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
  const d = t(locale);
  const leftW = 620;
  const gap = 64;
  const rightW = W - 2 * P - leftW - gap;
  const cols = 3;
  const cg = 14;
  const rows = Math.max(1, Math.ceil(spec.categories.length / cols));
  const gridH = H - 2 * P - 96;
  const cellH = Math.min(176, Math.floor((gridH - (rows - 1) * cg) / rows));
  const cellW = Math.floor((rightW - (cols - 1) * cg) / cols);
  const killed = killedLine(locale, data);
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", padding: P, width: W, height: H, boxSizing: "border-box", gap }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: leftW }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Logo locale={locale} height={64} />
            <div style={{ display: "flex", marginTop: 54 }}>
              <Kicker size={20}>{data.texts.periodLabel[locale]}</Kicker>
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Kyiv", fontSize: 46, lineHeight: 1.06, marginTop: 20 }}>
              {d.exportText.titleLines.map((l) => (
                <div key={l} style={{ display: "flex" }}>{l}</div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 250, lineHeight: 0.86, letterSpacing: -9, color: C.red, textShadow: "0 0 60px rgba(237,76,92,0.45)" }}>
              {fmt(data.totalCrimes, locale)}
            </div>
            <div style={{ display: "flex", width: leftW, height: 3, backgroundImage: `linear-gradient(90deg, ${C.red} 0%, ${C.deep} 45%, rgba(168,29,48,0) 100%)`, marginTop: 18 }} />
            <div style={{ display: "flex", fontSize: 24, color: C.text2, marginTop: 14, lineHeight: 1.3 }}>
              {nb(d.exportText.crimesBetween(formatLongDate(data.monitoringStart, locale, false), formatLongDate(data.asOfDate, locale)))}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
              {heroChips(locale, data).map((c) => (
                <StatChip key={c.label} value={c.value} label={c.label} w={(leftW - 14) / 2} />
              ))}
            </div>
          </div>
          <SourceLine locale={locale} data={data} size={19} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: rightW, justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
            <Kicker size={22} color={C.text}>{d.exportText.typesTitle}</Kicker>
            <div style={{ display: "flex", fontSize: 20, color: C.text2, letterSpacing: 2 }}>
              {`${formatShortDate(data.asOfDate)}${spec.count > 1 ? `  ·  ${spec.index}/${spec.count}` : ""}`}
            </div>
          </div>
          <Grid
            items={spec.categories}
            cols={cols}
            gap={cg}
            render={(c) => <CategoryCell c={c} locale={locale} w={cellW} h={cellH} iconSize={46} valueSize={54} labelSize={20} killedTotal={data.casualties.killedTotal} />}
            tail={
              spec.categories.length % cols !== 0 ? (
                <NoteCell w={cellW * (cols - (spec.categories.length % cols)) + cg * (cols - (spec.categories.length % cols) - 1)} h={cellH} text={killed} locale={locale} />
              ) : null
            }
          />
          <div style={{ display: "flex", minHeight: 24, fontSize: 17, color: C.muted }}>{spec.categories.length % cols === 0 ? (killed ?? "") : ""}</div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ Open Graph 1200×630 */

export function OgImage({ locale, data }: { locale: Locale; data: Data | null }) {
  const W = 1200;
  const H = 630;
  const d = t(locale);
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, width: W, height: H, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo locale={locale} height={58} />
          {data && <div style={{ display: "flex", fontSize: 22, color: C.text2, letterSpacing: 2 }}>{formatShortDate(data.asOfDate)}</div>}
        </div>
        {data ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
            <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 230, lineHeight: 0.86, letterSpacing: -8, color: C.red, textShadow: "0 0 60px rgba(237,76,92,0.45)" }}>
              {fmt(data.totalCrimes, locale)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: 560, paddingBottom: 8 }}>
              <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 36, lineHeight: 1.12 }}>{d.heroLabel(data.totalCrimes)}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 64, lineHeight: 1.05 }}>{d.projectName}</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, color: C.text2, borderTop: `1.5px solid ${C.lineStrong}`, paddingTop: 18 }}>
          <div style={{ display: "flex" }}>{data ? d.hero.since(formatLongDate(data.monitoringStart, locale)) : "imi.org.ua"}</div>
          <div style={{ display: "flex" }}>{data ? d.hero.asOf(formatLongDate(data.asOfDate, locale)) : ""}</div>
        </div>
      </div>
    </Frame>
  );
}

/* PNG templates rendered with Satori (flexbox subset of CSS). Same visual language as
   the site: radial diagram, dot rulers, IMI logo and date on every slide. Each format is
   composed for its own size — nothing is a scaled-down screenshot of the web page. */
import type { ReactNode } from "react";
import { visibleCategories, type Category, type Locale, type PublicSnapshot } from "../data/schema";
import { formatLongDate, formatShortDate } from "../data/dates";
import { t } from "../i18n/dictionaries";
import { RING, ringTicks, ringWedges, groupDigits } from "../viz/geometry";
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
        backgroundImage: `radial-gradient(circle at 85% 18%, rgba(237,76,92,0.30) 0%, rgba(237,76,92,0) 38%), radial-gradient(circle at 0% 100%, rgba(168,29,48,0.35) 0%, rgba(168,29,48,0) 45%)`,
        color: C.text,
        fontFamily: "Overpass",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: w,
          height: h,
          display: "flex",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1.5px)",
          backgroundSize: "28px 28px",
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

function Pill({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 12,
        padding: `${size * 0.42}px ${size * 0.9}px`,
        borderRadius: 999,
        border: "1.5px solid rgba(237,76,92,0.45)",
        backgroundColor: "rgba(168,29,48,0.16)",
        color: "#FF9AA4",
        fontSize: size,
      }}
    >
      <div style={{ display: "flex", width: size * 0.45, height: size * 0.45, borderRadius: 99, backgroundColor: C.red }} />
      {children}
    </div>
  );
}

function TopBar({ locale, spec, data, logoH }: { locale: Locale; spec: SlideSpec; data: Data; logoH: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Logo locale={locale} height={logoH} />
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 21, color: C.text2, letterSpacing: 1.5 }}>
        <div style={{ display: "flex" }}>{formatShortDate(data.asOfDate)}</div>
        {spec.count > 1 && (
          <div style={{ display: "flex", padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${C.lineStrong}`, color: C.text }}>
            {`${spec.index} / ${spec.count}`}
          </div>
        )}
      </div>
    </div>
  );
}

/** The radial diagram: one sector per category, number in the centre, icons around. */
function Rose({ data, locale, size }: { data: Data; locale: Locale; size: number }) {
  const cats = visibleCategories(data);
  const wedges = ringWedges(cats.map((c) => ({ id: c.id, value: c.value })));
  const S = RING.size;
  const k = size / S;
  const c = S / 2;
  const digits = String(data.totalCrimes).length;
  const fs = Math.min(size * 0.17, (size * 0.52) / digits);
  const icon = Math.round(34 * k * 1.25);
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
        <defs>
          <radialGradient id="heat" cx={c} cy={c} r={RING.outer} gradientUnits="userSpaceOnUse">
            <stop offset={RING.inner / RING.outer} stopColor="#7a1424" />
            <stop offset={(RING.inner + 40) / RING.outer} stopColor="#c62f45" />
            <stop offset="0.86" stopColor="#ed4c5c" />
            <stop offset="1" stopColor="#ffb3ba" />
          </radialGradient>
        </defs>
        <path d={ringTicks(120, RING.outer + 6, RING.outer + 12)} stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" />
        <circle cx={c} cy={c} r={RING.inner - 18} fill="none" stroke="rgba(237,76,92,0.4)" strokeWidth="1" strokeDasharray="2 6" />
        {wedges.map((w) => (
          <path key={`t${w.id}`} d={w.track} fill="rgba(255,255,255,0.045)" />
        ))}
        {wedges.map((w) => (
          <path key={w.id} d={w.path} fill="url(#heat)" stroke="#0B0B11" strokeWidth="1.2" />
        ))}
        <circle cx={c} cy={c} r={RING.inner - 26} fill="#120f16" />
      </svg>
      {wedges.map((w) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`i${w.id}`}
          src={iconUri(cats[w.index]!.iconId, "#BDBDBD")}
          width={icon}
          height={icon}
          alt=""
          style={{ position: "absolute", left: w.icon.x * k - icon / 2, top: w.icon.y * k - icon / 2 }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: fs, lineHeight: 1, letterSpacing: -fs * 0.03, color: "#FF6F7D", textShadow: "0 0 30px rgba(237,76,92,0.6)" }}>
          {num(data.totalCrimes)}
        </div>
        <div style={{ display: "flex", fontSize: Math.max(18, size * 0.034), color: C.text, marginTop: size * 0.012 }}>{t(locale).hero.ringLabel(data.totalCrimes)}</div>
        <div style={{ display: "flex", fontSize: Math.max(15, size * 0.026), color: C.muted, marginTop: 4 }}>
          {t(locale).hero.asOf(formatShortDate(data.asOfDate))}
        </div>
      </div>
    </div>
  );
}

function Stats({ data, locale, width, size = 1 }: { data: Data; locale: Locale; width: number; size?: number }) {
  const d = t(locale);
  const items: Array<{ v: string; l: string; c?: string }> = [];
  const p = data.period;
  if (p.newCases !== null) items.push({ v: `+${num(p.newCases)}`, l: p.start && p.end ? d.hero.statNew(formatShortDate(p.start), formatShortDate(p.end)) : d.hero.rowNew, c: C.ember });
  if (data.casualties.killedTotal !== null) items.push({ v: num(data.casualties.killedTotal), l: d.hero.statKilled });
  if (data.casualties.killedOnDuty !== null) items.push({ v: num(data.casualties.killedOnDuty), l: d.hero.statOnDuty });
  const w = (width - (items.length - 1) * 14) / Math.max(1, items.length);
  return (
    <div style={{ display: "flex", gap: 14, width }}>
      {items.map((it) => (
        <div
          key={it.l}
          style={{
            display: "flex",
            flexDirection: "column",
            width: w,
            padding: `${18 * size}px ${22 * size}px`,
            boxSizing: "border-box",
            borderRadius: 20,
            border: `1.5px solid ${C.lineStrong}`,
            backgroundColor: "rgba(20,20,26,0.85)",
          }}
        >
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 46 * size, lineHeight: 1, color: it.c ?? C.text }}>{it.v}</div>
          <div style={{ display: "flex", fontSize: 18 * size, color: C.text2, marginTop: 8, lineHeight: 1.25 }}>{it.l}</div>
        </div>
      ))}
    </div>
  );
}

/** One category as a row: icon, name, number and a dot ruler proportional to the value. */
function Row({ c, max, locale, w, h, scale = 1, killedTotal }: { c: Category; max: number; locale: Locale; w: number; h: number; scale?: number; killedTotal?: number | null }) {
  const name = c.name[locale];
  const cell = 12 * scale;
  const maxDots = Math.floor((w - 70 * scale) / cell);
  const dots = Math.max(1, Math.round((c.value / max) * maxDots));
  const nameRoom = w - 200 * scale;
  const nameSize = Math.max(15, Math.min(21 * scale, (nameRoom * 1.9) / Math.max(1, name.length) / 0.95, (nameRoom * 2) / (name.length * 0.55)));
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: w, height: h, borderBottom: `1.5px solid ${C.line}`, gap: 10 * scale }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 * scale }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUri(c.iconId, "#C8C8C8")} width={46 * scale} height={46 * scale} alt="" />
        <div style={{ display: "flex", flex: 1, fontSize: nameSize, lineHeight: 1.2, color: C.text }}>{name}</div>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 44 * scale, lineHeight: 1, color: C.red }}>{num(c.value)}</div>
          {killedTotal != null && c.id === "killings" && <div style={{ display: "flex", fontSize: 16 * scale, color: C.red, marginLeft: 4 }}>{`(${num(killedTotal)})*`}</div>}
        </div>
      </div>
      <div style={{ display: "flex", height: cell, marginLeft: 62 * scale }}>
        <div
          style={{
            display: "flex",
            width: dots * cell,
            height: cell,
            backgroundImage: `radial-gradient(circle, ${C.red} 32%, transparent 38%)`,
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />
        <div
          style={{
            display: "flex",
            width: (maxDots - dots) * cell,
            height: cell,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.10) 26%, transparent 32%)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />
      </div>
    </div>
  );
}

function Rows({ cats, data, locale, width, colH, cols, scale }: { cats: Category[]; data: Data; locale: Locale; width: number; colH: number; cols: number; scale?: number }) {
  const max = Math.max(1, ...visibleCategories(data).map((c) => c.value));
  const per = Math.ceil(cats.length / cols);
  const gap = 36;
  const colW = (width - gap * (cols - 1)) / cols;
  const rowH = Math.floor(colH / Math.max(per, 7));
  return (
    <div style={{ display: "flex", gap }}>
      {Array.from({ length: cols }, (_, ci) => (
        <div key={ci} style={{ display: "flex", flexDirection: "column", width: colW }}>
          {cats.slice(ci * per, (ci + 1) * per).map((c) => (
            <Row key={c.id} c={c} max={max} locale={locale} w={colW} h={rowH} scale={scale} killedTotal={data.casualties.killedTotal} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Footer({ locale, data, extra }: { locale: Locale; data: Data; extra?: string | null }) {
  const d = t(locale).exportText;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, fontSize: 18, color: C.muted, lineHeight: 1.35 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", color: C.text2 }}>{d.source}</div>
        <div style={{ display: "flex" }}>{nb(d.asOf(formatLongDate(data.asOfDate, locale)))}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: 560, textAlign: "right" }}>
        {extra && <div style={{ display: "flex" }}>{extra}</div>}
        <div style={{ display: "flex", color: C.text2 }}>imi.org.ua/russias-crimes</div>
      </div>
    </div>
  );
}

function killedLine(locale: Locale, data: Data): string | null {
  const { killedTotal, killedOnDuty } = data.casualties;
  if (killedTotal === null) return null;
  return `* ${t(locale).categories.killedFootnote(killedTotal, killedOnDuty)}`;
}

function Title({ locale, size }: { locale: Locale; size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "Kyiv", fontSize: size, lineHeight: 1.05, letterSpacing: -0.5 }}>
      {t(locale).exportText.titleLines.map((l) => (
        <div key={l} style={{ display: "flex" }}>
          {l}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ social 1080×1350 */

export function SocialSlide({ locale, data, spec }: { locale: Locale; data: Data; spec: SlideSpec }) {
  const W = 1080;
  const H = 1350;
  const P = 64;
  const inner = W - 2 * P;
  const d = t(locale);
  if (spec.index === 1) {
    return (
      <Frame w={W} h={H}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: P, width: W, height: H, boxSizing: "border-box" }}>
          <TopBar locale={locale} spec={spec} data={data} logoH={60} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 34 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <Pill size={21}>{data.texts.periodLabel[locale]}</Pill>
              <Title locale={locale} size={locale === "uk" ? 56 : 50} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Rose data={data} locale={locale} size={600} />
          </div>
          <Stats data={data} locale={locale} width={inner} />
          <Footer locale={locale} data={data} />
        </div>
      </Frame>
    );
  }
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: P, width: W, height: H, boxSizing: "border-box" }}>
        <TopBar locale={locale} spec={spec} data={data} logoH={60} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Pill size={21}>{data.texts.periodLabel[locale]}</Pill>
          <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 58, lineHeight: 1.04 }}>{d.exportText.typesTitle}</div>
        </div>
        <Rows cats={spec.categories} data={data} locale={locale} width={inner} colH={820} cols={1} scale={0.86} />
        <Footer locale={locale} data={data} extra={spec.categories.some((c) => c.id === "killings") ? killedLine(locale, data) : null} />
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ wide 1920×1080 */

export function WideSlide({ locale, data, spec }: { locale: Locale; data: Data; spec: SlideSpec }) {
  const W = 1920;
  const H = 1080;
  const P = 72;
  const leftW = 640;
  const gap = 80;
  const rightW = W - 2 * P - leftW - gap;
  const d = t(locale);
  return (
    <Frame w={W} h={H}>
      <div style={{ display: "flex", padding: P, width: W, height: H, gap, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: leftW }}>
          <Logo locale={locale} height={60} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <Pill size={19}>{data.texts.periodLabel[locale]}</Pill>
            <Title locale={locale} size={40} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Rose data={data} locale={locale} size={430} />
          </div>
          <Stats data={data} locale={locale} width={leftW} size={0.8} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: rightW }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
            <div style={{ display: "flex", fontFamily: "Kyiv", fontSize: 38 }}>{d.exportText.typesTitle}</div>
            <div style={{ display: "flex", fontSize: 21, color: C.text2, letterSpacing: 1.5 }}>
              {`${formatShortDate(data.asOfDate)}${spec.count > 1 ? `  ·  ${spec.index}/${spec.count}` : ""}`}
            </div>
          </div>
          <Rows cats={spec.categories} data={data} locale={locale} width={rightW} colH={780} cols={2} scale={0.92} />
          <Footer locale={locale} data={data} extra={spec.categories.some((c) => c.id === "killings") ? killedLine(locale, data) : null} />
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
      <div style={{ display: "flex", padding: 56, width: W, height: H, boxSizing: "border-box", gap: 40, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: H - 112, flex: 1 }}>
          <Logo locale={locale} height={58} />
          <Title locale={locale} size={50} />
          <div style={{ display: "flex", flexDirection: "column", fontSize: 22, color: C.text2, lineHeight: 1.35 }}>
            {data ? (
              <>
                <div style={{ display: "flex" }}>{nb(d.hero.since(formatLongDate(data.monitoringStart, locale)))}</div>
                <div style={{ display: "flex" }}>{nb(d.hero.asOf(formatLongDate(data.asOfDate, locale)))}</div>
              </>
            ) : (
              "imi.org.ua"
            )}
          </div>
        </div>
        {data && <Rose data={data} locale={locale} size={480} />}
      </div>
    </Frame>
  );
}

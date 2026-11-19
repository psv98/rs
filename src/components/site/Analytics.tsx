"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { visibleCategories, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, formatShortDate, yearOf } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { CategoryIcon } from "../ui/CategoryIcon";
import { Glyph } from "../ui/Glyph";

import { YEARS } from "@/lib/data/years";

export interface AnalyticsInitial {
  year: number | null;
  s: string | null;
  cmp: string | null;
  cat: string | null;
}

function writeUrl(state: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(state)) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event("imi:urlchange"));
}

export function Analytics({ locale, history, initial }: { locale: Locale; history: PublicSnapshot[]; initial: AnalyticsInitial }) {
  const d = t(locale).analytics;
  const nf = new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB");
  const fmt = (n: number) => nf.format(n).replace(/ /g, " ");
  const years = useMemo(() => Array.from(new Set([...YEARS, ...history.map((h) => yearOf(h.periodKey))])).sort(), [history]);

  const [year, setYear] = useState<number | null>(initial.year);
  const inYear = useMemo(() => (year === null ? history : history.filter((h) => yearOf(h.periodKey) === year)), [history, year]);
  const [sKey, setSKey] = useState<string | null>(initial.s && history.some((h) => h.periodKey === initial.s) ? initial.s : null);
  const selected = inYear.find((h) => h.periodKey === sKey) ?? inYear[0] ?? null;
  const defaultCmp = selected ? history[history.indexOf(selected) + 1]?.periodKey ?? null : null;
  const [cmpKey, setCmpKey] = useState<string | null | undefined>(initial.cmp === "none" ? null : initial.cmp ?? undefined);
  const cmpEffective = cmpKey === undefined ? defaultCmp : cmpKey;
  const compare = history.find((h) => h.periodKey === cmpEffective && h !== selected) ?? null;
  const cats = selected ? visibleCategories(selected.data) : [];
  const [catId, setCatId] = useState<string | null>(initial.cat);
  const cat = cats.find((c) => c.id === catId) ?? cats[0] ?? null;

  // Filters live in the URL so links can be shared; they are read in the browser
  // (the page itself may be static HTML).
  const hydrated = useRef(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const y = Number.parseInt(sp.get("year") ?? "", 10);
    const iso = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    if (Number.isInteger(y) && y >= 2022 && y <= 2100) setYear(y);
    if (iso(sp.get("s"))) setSKey(iso(sp.get("s")));
    if (sp.get("cmp") === "none") setCmpKey(null);
    else if (iso(sp.get("cmp"))) setCmpKey(iso(sp.get("cmp")));
    const c = sp.get("cat");
    if (c && /^[a-z0-9-]{2,48}$/.test(c)) setCatId(c);
    hydrated.current = true;
    if (Number.isInteger(y)) window.dispatchEvent(new CustomEvent("imi:year-sync", { detail: y }));
  }, []);

  // React to the year rail (history block).
  useEffect(() => {
    const onYear = (e: Event) => {
      const y = (e as CustomEvent<number | null>).detail;
      setYear(y);
      setSKey(null);
      setCmpKey(undefined);
    };
    window.addEventListener("imi:year", onYear);
    return () => window.removeEventListener("imi:year", onYear);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeUrl({
      year: year === null ? null : String(year),
      s: sKey,
      cmp: cmpKey === undefined ? null : cmpKey ?? "none",
      cat: catId,
    });
  }, [year, sKey, cmpKey, catId]);

  const max = Math.max(1, ...cats.map((c) => c.value));
  const sumSel = cats.reduce((s, c) => s + c.value, 0);
  const ranked = [...cats].sort((a, b) => b.value - a.value);
  const series = cat
    ? [...history]
        .reverse()
        .map((h) => ({ key: h.periodKey, v: h.data.categories.find((c) => c.id === cat.id && !c.hidden)?.value }))
        .filter((p): p is { key: string; v: number } => p.v !== undefined)
    : [];

  const delta = (a: number, b: number | undefined) => {
    if (b === undefined) return <span className="delta-zero">—</span>;
    const x = a - b;
    return <span className={x > 0 ? "delta-pos" : x < 0 ? "delta-neg" : "delta-zero"}>{x > 0 ? `+${fmt(x)}` : x < 0 ? `−${fmt(-x)}` : "0"}</span>;
  };

  return (
    <div>
      <div className="controls">
        <div className="field">
          <span id="year-label">{d.year}</span>
          <div className="chips" role="group" aria-labelledby="year-label">
            <button type="button" className="chip" aria-pressed={year === null} onClick={() => (setYear(null), setSKey(null), setCmpKey(undefined))}>
              {d.allYears}
            </button>
            {years.map((y) => {
              const has = history.some((h) => yearOf(h.periodKey) === y);
              return (
                <button key={y} type="button" className="chip" aria-pressed={year === y} disabled={!has} onClick={() => (setYear(y), setSKey(null), setCmpKey(undefined))}>
                  {y}
                </button>
              );
            })}
          </div>
        </div>
        {inYear.length > 0 && (
          <label className="field">
            {d.snapshot}
            <select className="select" value={selected?.periodKey ?? ""} onChange={(e) => (setSKey(e.target.value), setCmpKey(undefined))}>
              {inYear.map((h) => (
                <option key={h.periodKey} value={h.periodKey}>
                  {d.asOfShort(formatShortDate(h.periodKey))} — {fmt(h.data.totalCrimes)}
                </option>
              ))}
            </select>
          </label>
        )}
        {history.length > 1 && selected && (
          <label className="field">
            {d.compareWith}
            <select className="select" value={compare?.periodKey ?? ""} onChange={(e) => setCmpKey(e.target.value || null)}>
              <option value="">{d.noCompare}</option>
              {history
                .filter((h) => h !== selected)
                .map((h) => (
                  <option key={h.periodKey} value={h.periodKey}>
                    {d.asOfShort(formatShortDate(h.periodKey))} — {fmt(h.data.totalCrimes)}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>

      {!selected ? (
        <p className="notice">{d.noSnapshotsInYear}</p>
      ) : (
        <div className="analytics-grid">
          <div>
            <div className="table-wrap">
              <table className="datatable">
                <caption className="sr-only">
                  {d.title}: {formatLongDate(selected.periodKey, locale)}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{d.colCategory}</th>
                    <th scope="col" className="num">
                      {formatShortDate(selected.periodKey)}
                    </th>
                    {compare && (
                      <>
                        <th scope="col" className="num">
                          {formatShortDate(compare.periodKey)}
                        </th>
                        <th scope="col" className="num">
                          {d.colDelta}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => {
                    const prev = compare?.data.categories.find((x) => x.id === c.id && !x.hidden)?.value;
                    return (
                      <tr key={c.id} aria-selected={cat?.id === c.id} onClick={() => setCatId(c.id)}>
                        <td>
                          <button type="button" className="rowbtn catname" onClick={() => setCatId(c.id)} aria-pressed={cat?.id === c.id}>
                            <CategoryIcon id={c.iconId} />
                            {c.name[locale]}
                          </button>
                        </td>
                        <td className="num">
                          {fmt(c.value)}
                          <span className="minibar" aria-hidden="true">
                            <span style={{ width: `${(c.value / max) * 100}%` }} />
                          </span>
                        </td>
                        {compare && (
                          <>
                            <td className="num">{prev === undefined ? "—" : fmt(prev)}</td>
                            <td className="num">{delta(c.value, prev)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>{d.total}</td>
                    <td className="num">{fmt(selected.data.totalCrimes)}</td>
                    {compare && (
                      <>
                        <td className="num">{fmt(compare.data.totalCrimes)}</td>
                        <td className="num">{delta(selected.data.totalCrimes, compare.data.totalCrimes)}</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
            {history.length < 2 && <p className="notice" style={{ marginTop: "1rem" }}>{d.onlyOne}</p>}
          </div>

          {cat && (
            <aside className="panel" aria-live="polite" aria-label={d.selected}>
              <p className="muted">{d.selected}</p>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.75rem" }}>
                <CategoryIcon id={cat.iconId} className="cell__icon" />
                <h3>{cat.name[locale]}</h3>
              </div>
              <p className="big">{fmt(cat.value)}</p>
              <p className="muted" style={{ marginTop: "0.5rem" }}>
                {d.rank(ranked.findIndex((c) => c.id === cat.id) + 1, ranked.length)}
                {sumSel > 0 && <><br />{`${((cat.value / sumSel) * 100).toFixed(1).replace(".", locale === "uk" ? "," : ".")}% ${locale === "uk" ? "від суми категорій" : "of the category sum"}`}</>}
              </p>
              {cat.description[locale] && <p style={{ marginTop: "1rem", color: "var(--color-ash)" }}>{cat.description[locale]}</p>}
              {series.length > 1 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <p className="muted">{d.acrossSnapshots}</p>
                  <Spark points={series} fmt={fmt} />
                </div>
              )}
              <p style={{ marginTop: "1.25rem" }}>
                <a className="link" href={selected.data.sources.registry || "https://imi.org.ua/russias-crimes"} target="_blank" rel="noopener">
                  {d.registry}
                </a>{" "}
                <Glyph name="external" className="inline w-4 h-4 align-[-2px] text-[var(--color-ash-2)]" />
              </p>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

/** Minimal line of published values — only drawn when there are ≥2 real data points. */
function Spark({ points, fmt }: { points: { key: string; v: number }[]; fmt: (n: number) => string }) {
  const W = 320;
  const H = 70;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * (W - 16) + 8);
  const y = (v: number) => (max === min ? H / 2 : H - 10 - ((v - min) / (max - min)) * (H - 24));
  return (
    <figure style={{ marginTop: "0.5rem" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={points.map((p) => `${formatShortDate(p.key)}: ${fmt(p.v)}`).join("; ")}>
        <polyline fill="none" stroke="var(--color-signal)" strokeWidth="2" points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />
        {points.map((p, i) => (
          <circle key={p.key} cx={x(i)} cy={y(p.v)} r="3.5" fill="var(--color-night)" stroke="var(--color-signal)" strokeWidth="2" />
        ))}
      </svg>
      <figcaption style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-ash-2)" }}>
        <span>
          {formatShortDate(points[0].key)}: {fmt(points[0].v)}
        </span>
        <span>
          {formatShortDate(points[points.length - 1].key)}: {fmt(points[points.length - 1].v)}
        </span>
      </figcaption>
    </figure>
  );
}

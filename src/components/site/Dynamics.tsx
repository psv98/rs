import type { CSSProperties } from "react";
import type { Locale, PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, formatShortDate, todayIso, yearOf } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { groupDigits, niceMax } from "@/lib/viz/geometry";
import { DynamicsChart, type ChartPoint } from "./DynamicsChart";

/*
 * Year cards sit on a 6-track grid. Wide screens: three per row in date order; cards of an
 * incomplete last row share the row (2028 alone would take the full width). Tablets: two
 * per row. Phones: the current year first across the full width, earlier years two per row.
 */
const span = (i: number, n: number, cols: number) => {
  const r = n % cols;
  return r && i >= n - r ? 6 / r : 6 / cols;
};
const phoneSpan = (i: number, n: number) => (i === n - 1 ? 6 : span(i, n - 1, 2));

/** How the cumulative figure changed: chart of published IMI totals + one card per year. */
export function Dynamics({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const d = t(locale).dynamics;
  const data = snap.data;
  const points: ChartPoint[] = [
    ...data.history.points
      .filter((p) => p.total !== null)
      .map((p) => ({ date: p.date, total: p.total!, killedTotal: p.killedTotal, note: p.note[locale], source: p.source, label: formatLongDate(p.date, locale) })),
    {
      date: data.asOfDate,
      total: data.totalCrimes,
      killedTotal: data.casualties.killedTotal,
      note: "",
      source: data.sources.articleUk,
      current: true,
      label: formatLongDate(data.asOfDate, locale),
    },
  ];
  if (points.length < 2) return null;
  const nowYear = yearOf(todayIso());
  const asOfYear = yearOf(data.asOfDate);
  // One card per year from the start of monitoring to the year of the current data: a new
  // year gets its card with the first publication dated in it, nothing to add by hand.
  const firstYear = yearOf(data.monitoringStart);
  const years = Array.from(new Set([...Array.from({ length: asOfYear - firstYear + 1 }, (_, i) => firstYear + i), ...points.map((p) => yearOf(p.date))])).sort();
  const yMax = niceMax(Math.max(...points.map((p) => p.total)));
  let prevEnd = 0;
  const cards = years.map((yr) => {
    const inYear = points.filter((p) => yearOf(p.date) === yr);
    const last = inYear[inYear.length - 1];
    const meta = data.history.years.find((y) => y.year === yr);
    const delta = last ? last.total - prevEnd : null;
    if (last) prevEnd = last.total;
    return { yr, last, delta, meta, future: yr > nowYear || (yr > yearOf(data.asOfDate) && !last) };
  });
  return (
    <section className="section" id="dynamics" aria-labelledby="dyn-title">
      <div className="shell">
        <header className="section__head">
          <h2 id="dyn-title" className="section__title">
            {d.title}
          </h2>
          <p className="section__lead">{d.lead}</p>
        </header>
        <DynamicsChart
          points={points}
          start={data.monitoringStart}
          ariaLabel={d.chartAria(points.length, formatShortDate(points[0]!.date), formatShortDate(data.asOfDate))}
          labels={{ killed: d.killed, source: d.source, start: d.start }}
        />
        <ol className="years" aria-label={d.yearsTitle}>
          {cards.map(({ yr, last, delta, meta, future }, i) => (
            <li
              key={yr}
              className="year"
              data-state={future ? "future" : last ? "data" : "empty"}
              data-current={i === cards.length - 1 || undefined}
              style={{ "--i": i, "--s3": span(i, cards.length, 3), "--s2": span(i, cards.length, 2), "--sm": phoneSpan(i, cards.length) } as CSSProperties}
            >
              <p className="year__y">{yr}</p>
              {last ? (
                <>
                  <p className="year__v">{groupDigits(last.total)}</p>
                  <p className="year__at">{d.asOf(formatShortDate(last.date))}</p>
                  <div className="year__bar" aria-hidden="true">
                    <span style={{ height: `${(last.total / yMax) * 100}%` }} />
                    {delta !== null && delta > 0 && <span className="year__bar-add" style={{ height: `${(delta / yMax) * 100}%` }} />}
                  </div>
                  <dl className="year__facts">
                    {delta !== null && (
                      <div>
                        <dt>{d.delta}</dt>
                        <dd>+{groupDigits(delta)}</dd>
                      </div>
                    )}
                    {meta?.killedInYear != null && (
                      <div>
                        <dt>{d.killedInYear}</dt>
                        <dd>{groupDigits(meta.killedInYear)}</dd>
                      </div>
                    )}
                  </dl>
                  {meta?.note[locale] && <p className="year__note">{meta.note[locale]}</p>}
                </>
              ) : (
                <p className="year__empty">{future ? d.future : d.noData}</p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

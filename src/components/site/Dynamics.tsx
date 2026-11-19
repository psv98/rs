import type { CSSProperties } from "react";
import type { Locale, PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, formatShortDate, todayIso, yearOf } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { YEARS } from "@/lib/data/years";
import { groupDigits, niceMax } from "@/lib/viz/geometry";
import { DynamicsChart, type ChartPoint } from "./DynamicsChart";

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
  const years = Array.from(new Set([...YEARS.filter((y) => y <= asOfYear), ...points.map((p) => yearOf(p.date))])).sort();
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
          <div className="section__aside">
            <p className="section__lead">{d.lead}</p>
          </div>
        </header>
        <DynamicsChart
          points={points}
          start={data.monitoringStart}
          ariaLabel={d.chartAria(points.length, formatShortDate(points[0]!.date), formatShortDate(data.asOfDate))}
          labels={{ killed: d.killed, source: d.source, start: d.start, brand: d.brand }}
        />
        <ol className="years" aria-label={d.yearsTitle}>
          {cards.map(({ yr, last, delta, meta, future }, i) => (
            <li key={yr} className="year" data-state={future ? "future" : last ? "data" : "empty"} style={{ "--i": i } as CSSProperties}>
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
                  {meta?.source && (
                    <a className="year__src" href={meta.source} target="_blank" rel="noopener">
                      {d.source}
                    </a>
                  )}
                </>
              ) : (
                <p className="year__empty">{future ? d.future : d.noData}</p>
              )}
            </li>
          ))}
        </ol>
        <details className="dyn-table">
          <summary>{d.allPoints(points.length)}</summary>
          <div className="table-wrap">
            <table className="datatable">
              <thead>
                <tr>
                  <th scope="col">{d.colDate}</th>
                  <th scope="col" className="num">
                    {d.colTotal}
                  </th>
                  <th scope="col" className="num">
                    {d.killed}
                  </th>
                  <th scope="col">{d.colNote}</th>
                  <th scope="col">{d.source}</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.date}>
                    <td>{p.label}</td>
                    <td className="num">{groupDigits(p.total)}</td>
                    <td className="num">{p.killedTotal !== null ? groupDigits(p.killedTotal) : "—"}</td>
                    <td>{p.note}</td>
                    <td>
                      {p.source && (
                        <a className="link" href={p.source} target="_blank" rel="noopener">
                          {new URL(p.source).host.replace(/^www\./, "")}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dyn-table__note">{d.footnote}</p>
        </details>
      </div>
    </section>
  );
}

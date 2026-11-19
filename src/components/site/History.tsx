import type { Locale, PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, todayIso, yearOf } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { YEARS } from "@/lib/data/years";
import { YearRail } from "./YearRail";

export function History({ locale, history, initialYear }: { locale: Locale; history: PublicSnapshot[]; initialYear: number | null }) {
  const d = t(locale).history;
  const counts: Record<number, number> = {};
  for (const h of history) counts[yearOf(h.periodKey)] = (counts[yearOf(h.periodKey)] ?? 0) + 1;
  const years = Array.from(new Set([...YEARS, ...Object.keys(counts).map(Number)])).sort();
  const fmt = (n: number) => new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB").format(n).replace(/ /g, " ");
  return (
    <section className="section" id="history" aria-labelledby="history-title">
      <div className="shell">
        <div className="section__head">
          <h2 id="history-title" className="section__title">
            {d.title}
          </h2>
          <p className="section__lead">{d.lead}</p>
        </div>
        <YearRail locale={locale} counts={counts} years={years} currentYear={yearOf(todayIso())} initialYear={initialYear} />
        <div className="changelog">
          <h3 className="sr-only">{d.changelog}</h3>
          <p style={{ fontWeight: 600, padding: "1rem 0 0.25rem" }}>{d.changelog}</p>
          {history.length === 0 ? (
            <p className="notice">{d.noHistory}</p>
          ) : (
            <ol>
              {history.map((h) => (
                <li key={h.id}>
                  <span className="when">{h.publishedAt ? `${d.published} ${formatLongDate(h.publishedAt.slice(0, 10), locale, false)}` : ""}</span>
                  <span>
                    {formatLongDate(h.periodKey, locale)}
                    {h.revision > 1 && <span className="tag tag--warn">{d.revised}</span>}
                  </span>
                  <span className="val">{fmt(h.data.totalCrimes)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

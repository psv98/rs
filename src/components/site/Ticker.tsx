import { visibleCategories, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, formatShortDate } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";

/** Running line of plain facts taken from the published snapshot. */
export function Ticker({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const d = t(locale).ticker;
  const data = snap.data;
  const items: string[] = [d.total(data.totalCrimes, formatLongDate(data.monitoringStart, locale))];
  if (data.casualties.killedTotal !== null) items.push(d.killed(data.casualties.killedTotal, data.casualties.killedOnDuty));
  const p = data.period;
  if (p.newCases !== null && p.start && p.end) items.push(d.fresh(p.newCases, formatShortDate(p.start), formatShortDate(p.end)));
  const top = visibleCategories(data)
    .filter((c) => c.id !== "killings")
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  for (const c of top) items.push(d.category(c.name[locale], c.value));
  items.push(d.source(formatLongDate(data.asOfDate, locale)));
  const group = (hidden: boolean) => (
    <div className="ticker__group" aria-hidden={hidden || undefined}>
      {items.map((s, i) => (
        <span className="ticker__item" key={i}>
          {s}
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker" role="region" aria-label={d.region}>
      <div className="ticker__track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

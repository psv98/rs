import type { Locale, PublicSnapshot } from "@/lib/data/schema";
import { formatShortDate } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";

export function Ticker({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const items = t(locale).ticker(formatShortDate(snap.data.asOfDate), formatShortDate(snap.data.monitoringStart), snap.data.period.newCases);
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
    <div className="ticker" role="region" aria-label={locale === "uk" ? "Коротко про моніторинг" : "Monitoring at a glance"}>
      <div className="ticker__track">
        {group(false)}
        {group(true)}
        {group(true)}
        {group(true)}
      </div>
    </div>
  );
}

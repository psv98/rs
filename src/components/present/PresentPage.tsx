import type { Locale } from "@/lib/data/schema";
import { visibleCategories } from "@/lib/data/schema";
import { dynamicInServerMode, getPublicState } from "@/lib/data/public";
import { formatLongDate } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, withBase } from "@/lib/site";
import { CategoryIcon } from "../ui/CategoryIcon";
import { Glyph } from "../ui/Glyph";
import { FullscreenButton } from "./FullscreenButton";

/** Large-screen mode: the headline figure and all categories, nothing else. */
export async function PresentPage({ locale }: { locale: Locale }) {
  await dynamicInServerMode();
  const { current } = await getPublicState();
  const d = t(locale);
  const fmt = (n: number) => new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB").format(n).replace(/ /g, " ");
  return (
    <main className="present" id="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBase(`/brand/imi-logo-${locale}.svg`)} alt={d.org} height={52} style={{ height: 52, width: "auto" }} />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <FullscreenButton label={d.present.fullscreen} />
          <a className="btn" href={pageHref(locale)}>
            <Glyph name="close" />
            {d.present.exit}
          </a>
        </div>
      </div>
      {current ? (
        <div className="present__main">
          <div>
            <p className="hero__period">{current.data.texts.periodLabel[locale]}</p>
            <h1>
              <span className="hero__figure">{fmt(current.data.totalCrimes)}</span>
              <span className="hero__label" style={{ display: "block" }}>
                {d.heroLabel(current.data.totalCrimes)}
              </span>
            </h1>
            <p className="hero__dates">
              <span>
                <strong>{d.hero.since(formatLongDate(current.data.monitoringStart, locale))}</strong>
              </span>
              <span>{d.hero.asOf(formatLongDate(current.data.asOfDate, locale))}</span>
            </p>
          </div>
          <div className="present-grid" role="list" aria-label={d.categories.title}>
            {visibleCategories(current.data).map((c) => (
              <div key={c.id} role="listitem">
                <CategoryIcon id={c.iconId} />
                <b>
                  {fmt(c.value)}
                  {c.id === "killings" && current.data.casualties.killedTotal !== null && (
                    <small style={{ fontSize: "0.4em", marginLeft: "0.3em", verticalAlign: "super" }}>({fmt(current.data.casualties.killedTotal)})*</small>
                  )}
                </b>
                <span>{c.name[locale]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <h1 className="section__title">{d.empty.title}</h1>
      )}
      <p style={{ color: "var(--color-ash-2)", fontSize: "0.95rem" }}>
        {current?.data.casualties.killedTotal != null && `* ${d.categories.killedFootnote(current.data.casualties.killedTotal, current.data.casualties.killedOnDuty)} `}
        {d.exportText.source}. imi.org.ua
      </p>
    </main>
  );
}

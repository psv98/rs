import type { Locale } from "@/lib/data/schema";
import { visibleCategories } from "@/lib/data/schema";
import { dynamicInServerMode, getPublicState } from "@/lib/data/public";

import { t } from "@/lib/i18n/dictionaries";
import { pageHref, withBase } from "@/lib/site";
import { CategoryIcon } from "../ui/CategoryIcon";
import { Glyph } from "../ui/Glyph";
import { FullscreenButton } from "./FullscreenButton";
import { HeroRing } from "../site/HeroRing";
import { formatShortDate } from "@/lib/data/dates";

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
          <div style={{ display: "grid", gap: "1.5rem", justifyItems: "start" }}>
            <p className="hero__period">{current.data.texts.periodLabel[locale]}</p>
            <h1 className="hero__title" style={{ marginTop: 0 }}>{d.hero.title}</h1>
            <HeroRing
              total={current.data.totalCrimes}
              categories={visibleCategories(current.data).map((c) => ({ id: c.id, iconId: c.iconId, value: c.value, name: c.name[locale] }))}
              label={d.hero.ringLabel(current.data.totalCrimes)}
              caption={d.hero.asOf(formatShortDate(current.data.asOfDate))}
              ariaLabel={d.hero.ringAria(current.data.totalCrimes)}
            />
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

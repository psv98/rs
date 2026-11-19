import type { CSSProperties } from "react";
import type { Locale } from "@/lib/data/schema";
import { visibleCategories } from "@/lib/data/schema";
import { dynamicInServerMode, getPublicState } from "@/lib/data/public";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, withBase } from "@/lib/site";
import { formatShortDate } from "@/lib/data/dates";
import { CategoryIcon } from "../ui/CategoryIcon";
import { Glyph } from "../ui/Glyph";
import { FullscreenButton } from "./FullscreenButton";
import { HeroRing } from "../site/HeroRing";
import { PresentStage } from "./PresentStage";
import { WarPlaque } from "../site/WarPlaque";

/**
 * Presentation mode: the headline figure and all categories on one 1920×1080 canvas,
 * scaled to the screen. Three categories per row; an incomplete last row is stretched
 * to the full width.
 */
export async function PresentPage({ locale }: { locale: Locale }) {
  await dynamicInServerMode();
  const { current } = await getPublicState();
  const d = t(locale);
  const fmt = (n: number) => new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB").format(n).replace(/\s/g, " ");
  const cats = current ? visibleCategories(current.data) : [];
  const rest = cats.length % 3; // items in an incomplete last row
  const [t1, t2, t3] = d.hero.titleParts;
  return (
    <main className="present" id="main">
      <PresentStage>
        <header className="present__top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBase(`/brand/imi-logo-${locale}.svg`)} alt={d.org} className="present__logo" />
          {current && <WarPlaque label={current.data.texts.periodLabel[locale]} className="present__plaque" />}
          <div className="present__actions">
            <FullscreenButton label={d.present.fullscreen} />
            <a className="btn btn--lg" href={pageHref(locale)}>
              <Glyph name="close" />
              <span>{d.present.exit}</span>
            </a>
          </div>
        </header>
        {current ? (
          <>
            <h1 className="present__title">
              {t1}
              <span className="hero__title-accent">{t2}</span>
              {t3}
            </h1>
            <div className="present__body">
              <div className="present__ring">
                <HeroRing
                  total={current.data.totalCrimes}
                  categories={cats.map((c) => ({ id: c.id, iconId: c.iconId, value: c.value, name: c.name[locale] }))}
                  label={d.hero.ringLabel(current.data.totalCrimes)}
                  caption={d.hero.asOf(formatShortDate(current.data.asOfDate))}
                  ariaLabel={d.hero.ringAria(current.data.totalCrimes)}
                />
              </div>
              <div className="present__right">
                <div className="present-grid" role="list" aria-label={d.categories.title} style={{ "--rows": Math.ceil(cats.length / 3) } as CSSProperties}>
                  {cats.map((c, i) => {
                    const inLastRow = rest > 0 && i >= cats.length - rest;
                    const span = inLastRow ? 6 / rest : 2;
                    return (
                      <div key={c.id} role="listitem" style={{ gridColumn: `span ${span}` }}>
                        <CategoryIcon id={c.iconId} />
                        <b>
                          {fmt(c.value)}
                          {c.id === "killings" && current.data.casualties.killedTotal !== null && <small>({fmt(current.data.casualties.killedTotal)})*</small>}
                        </b>
                        <span>{c.name[locale]}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="present__note">
                  {current.data.casualties.killedTotal !== null && `* ${d.categories.killedFootnote(current.data.casualties.killedTotal, current.data.casualties.killedOnDuty)} `}
                  {d.exportText.source}. imi.org.ua
                </p>
              </div>
            </div>
          </>
        ) : (
          <h1 className="present__title">{d.empty.title}</h1>
        )}
      </PresentStage>
    </main>
  );
}

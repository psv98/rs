import type { Locale, PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, formatShortDate } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, routePath } from "@/lib/site";
import { CountUp } from "./CountUp";
import { ShareTools } from "./ShareTools";

export function Hero({ locale, snap, siteUrl }: { locale: Locale; snap: PublicSnapshot; siteUrl: string }) {
  const d = t(locale);
  const data = snap.data;
  const since = formatLongDate(data.monitoringStart, locale);
  const asOf = formatLongDate(data.asOfDate, locale);
  const p = data.period;
  const k = data.casualties;
  const fmt = (n: number) => new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB").format(n).replace(/ /g, " ");
  return (
    <section className="hero" id="stats" aria-labelledby="hero-title">
      <div className="shell hero__grid">
        <div>
          <p className="hero__period">{data.texts.periodLabel[locale]}</p>
          <h1 id="hero-title">
            <span className="hero__figure">
              <CountUp value={data.totalCrimes} locale={locale} />
              <span className="hero__scan" aria-hidden="true" />
            </span>
            <span className="sr-only">{`${fmt(data.totalCrimes)} `}</span>
            <span className="hero__underline" aria-hidden="true" style={{ display: "block" }} />
            <span className="hero__label" style={{ display: "block" }}>
              {d.heroLabel(data.totalCrimes)}
            </span>
          </h1>
          <p className="hero__dates">
            <span>
              <strong>{d.hero.since(since)}</strong>
            </span>
            <span>{d.hero.asOf(asOf)}</span>
          </p>
          <ShareTools
            statsText={d.share.statsText(data.totalCrimes, asOf, since, `${siteUrl}${routePath(locale)}`)}
            labels={{ copyStats: d.share.copyStats, copied: d.share.copied, share: d.share.share, present: d.share.present }}
            presentHref={pageHref(locale, "/present")}
            title={d.projectName}
          />
        </div>
        <aside className="casefile" aria-label={d.hero.statusTitle}>
          <p className="casefile__title">
            <span className="casefile__pulse" aria-hidden="true" />
            {d.hero.statusTitle}
          </p>
          <dl>
            <div className="casefile__row">
              <dt>{d.hero.rowPeriod}</dt>
              <dd>
                {formatShortDate(data.monitoringStart)} — {formatShortDate(data.asOfDate)}
              </dd>
            </div>
            {p.newCases !== null && (
              <div className="casefile__row">
                <dt>{d.hero.rowNew}</dt>
                <dd>
                  <span className="delta">{d.hero.newValue(p.newCases)}</span>
                  {p.start && p.end && (
                    <small>
                      {formatShortDate(p.start)} — {formatShortDate(p.end)}
                    </small>
                  )}
                </dd>
              </div>
            )}
            {k.killedTotal !== null && (
              <div className="casefile__row">
                <dt>{d.hero.rowKilled}</dt>
                <dd>
                  {fmt(k.killedTotal)}
                  {k.killedOnDuty !== null && <small>{locale === "uk" ? `з них ${k.killedOnDuty} — під час роботи` : `${k.killedOnDuty} of them while reporting`}</small>}
                </dd>
              </div>
            )}
            <div className="casefile__row">
              <dt>{d.hero.rowAsOf}</dt>
              <dd>{formatShortDate(data.asOfDate)}</dd>
            </div>
            <div className="casefile__row">
              <dt>{d.hero.rowSource}</dt>
              <dd>
                <a className="link" href={locale === "uk" ? data.sources.articleUk || "https://imi.org.ua/" : data.sources.articleEn || data.sources.articleUk || "https://imi.org.ua/en/"} rel="noopener" target="_blank">
                  {d.hero.sourceValue}
                </a>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

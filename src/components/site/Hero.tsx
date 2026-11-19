import type { CSSProperties } from "react";
import { visibleCategories, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { formatLongDate, formatShortDate } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, routePath } from "@/lib/site";
import { groupDigits } from "@/lib/viz/geometry";
import { HeroRing } from "./HeroRing";
import { ShareTools } from "./ShareTools";
import { WarTimeline } from "./WarTimeline";

export function Hero({ locale, snap, siteUrl }: { locale: Locale; snap: PublicSnapshot; siteUrl: string }) {
  const d = t(locale);
  const data = snap.data;
  const since = formatLongDate(data.monitoringStart, locale);
  const asOf = formatLongDate(data.asOfDate, locale);
  const p = data.period;
  const k = data.casualties;
  const cats = visibleCategories(data);
  const stats: Array<{ value: string; label: string; tone?: "ember" }> = [];
  if (p.newCases !== null)
    stats.push({
      value: `+${groupDigits(p.newCases)}`,
      label: p.start && p.end ? d.hero.statNew(formatShortDate(p.start), formatShortDate(p.end)) : d.hero.rowNew,
      tone: "ember",
    });
  if (k.killedTotal !== null) stats.push({ value: groupDigits(k.killedTotal), label: d.hero.statKilled });
  if (k.killedOnDuty !== null) stats.push({ value: groupDigits(k.killedOnDuty), label: d.hero.statOnDuty });
  return (
    <section className="hero" id="stats" aria-labelledby="hero-title">
      <div className="aurora" aria-hidden="true" />
      <div className="hero__grid shell">
        <div className="hero__copy">
          <WarTimeline label={data.texts.periodLabel[locale]} start={data.monitoringStart} end={data.asOfDate} />
          <h1 id="hero-title" className="hero__title">
            {d.hero.title}
          </h1>
          <p className="hero__dek">
            <span className="sr-only">{`${groupDigits(data.totalCrimes)} ${d.heroLabel(data.totalCrimes)}. `}</span>
            {d.hero.dek(since, asOf)}
          </p>
        </div>
        <div className="hero__facts">
          {stats.length > 0 && (
            <dl className="hero__stats">
              {stats.map((s, i) => (
                <div key={s.label} className="hero__stat" style={{ "--i": i } as CSSProperties}>
                  <dt>{s.label}</dt>
                  <dd data-tone={s.tone}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <ShareTools
            statsText={d.share.statsText(data.totalCrimes, asOf, since, `${siteUrl}${routePath(locale)}`)}
            labels={{ copyStats: d.share.copyStats, copied: d.share.copied, share: d.share.share, present: d.share.present }}
            presentHref={pageHref(locale, "/present")}
            title={d.projectName}
          />
        </div>
        <div className="hero__visual">
          <div className="hero__ringhead">
            <h2 className="hero__ringtitle">{d.hero.ringTitle}</h2>
            <p className="hero__legend">{d.hero.legend}</p>
          </div>
          <HeroRing
            total={data.totalCrimes}
            categories={cats.map((c) => ({ id: c.id, iconId: c.iconId, value: c.value, name: c.name[locale] }))}
            label={d.hero.ringLabel(data.totalCrimes)}
            caption={d.hero.asOf(formatShortDate(data.asOfDate))}
            ariaLabel={d.hero.ringAria(data.totalCrimes)}
          />
        </div>
      </div>
    </section>
  );
}

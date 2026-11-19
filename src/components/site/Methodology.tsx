import { categorySum, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { formatDateTime, formatLongDate } from "@/lib/data/dates";
import { t } from "@/lib/i18n/dictionaries";

export function Methodology({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const d = t(locale);
  const m = d.methodology;
  const data = snap.data;
  const sum = categorySum(data);
  const links: Array<[string, string]> = [
    [m.articleUk, data.sources.articleUk],
    [m.articleEn, data.sources.articleEn],
    [m.registry, data.sources.registry],
    [m.imiSite, locale === "uk" ? "https://imi.org.ua/" : "https://imi.org.ua/en/"],
  ].filter(([, u]) => !!u) as Array<[string, string]>;
  return (
    <section className="section" id="methodology" aria-labelledby="method-title">
      <div className="shell">
        <div className="section__head">
          <h2 id="method-title" className="section__title">
            {m.title}
          </h2>
          <p className="section__lead">{m.about}</p>
        </div>
        <div className="method">
          <div className="method__cols">
            <div>
              <h3>{m.whoTitle}</h3>
              <p>{m.who}</p>
            </div>
            <div>
              <h3>{m.periodTitle}</h3>
              <p>
                {formatLongDate(data.monitoringStart, locale)} — {formatLongDate(data.asOfDate, locale)}
              </p>
            </div>
            <div className="callout">
              <h3>{m.legalTitle}</h3>
              <p>{m.legal}</p>
            </div>
            <div>
              <h3>{m.separateTitle}</h3>
              <p>{m.separate}</p>
            </div>
            <div>
              <h3>{m.sumTitle}</h3>
              <p>
                {sum === data.totalCrimes ? d.categories.sumMatches(sum) : d.categories.sumNote(sum, data.totalCrimes)}
                {sum !== data.totalCrimes && data.verification.sumMismatchConfirmed && data.verification.sumMismatchExplanation[locale] && (
                  <>
                    {" "}
                    {m.sumConfirmed} {data.verification.sumMismatchExplanation[locale]}
                  </>
                )}
              </p>
            </div>
            {data.texts.editorNote[locale] && (
              <div>
                <h3>{m.editorNote}</h3>
                <p style={{ whiteSpace: "pre-line" }}>{data.texts.editorNote[locale]}</p>
              </div>
            )}
          </div>
          <div className="sources">
            <h3>{m.sourcesTitle}</h3>
            {links.map(([label, url]) => (
              <a key={url} href={url} target="_blank" rel="noopener">
                <span>{label}</span>
                <span>{new URL(url).host + (new URL(url).pathname.length > 1 ? "/…" : "")}</span>
              </a>
            ))}
            <p className="updated">
              {m.lastUpdate}: {formatLongDate(data.asOfDate, locale)}
              {snap.publishedAt && (
                <>
                  <br />
                  <span style={{ color: "var(--color-ash-2)" }}>
                    {locale === "uk" ? "Опубліковано на сайті" : "Published on this site"}: {formatDateTime(snap.publishedAt, locale)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

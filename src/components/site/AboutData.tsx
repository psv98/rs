import { categorySum, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { Glyph, type GlyphName } from "../ui/Glyph";

/** «Про дані»: who counts, what is counted, how to read it, primary sources. */
export function AboutData({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const d = t(locale);
  const m = d.about;
  const data = snap.data;
  const sum = categorySum(data);
  const facts: Array<{ title: string; text: string; icon: GlyphName }> = [
    { title: m.whoTitle, text: m.who, icon: "people" },
    { title: m.whatTitle, text: m.what, icon: "target" },
    { title: m.howTitle, text: m.how, icon: "calendar" },
    {
      title: m.readTitle,
      text:
        sum === data.totalCrimes
          ? d.categories.sumMatches(sum)
          : `${d.categories.sumNote(sum, data.totalCrimes)}${
              data.verification.sumMismatchConfirmed && data.verification.sumMismatchExplanation[locale] ? ` ${data.verification.sumMismatchExplanation[locale]}` : ""
            }`,
      icon: "layers",
    },
  ];
  const sources: Array<[string, string]> = (
    [
      [m.registry, data.sources.registry],
      [m.imiSite, locale === "uk" ? "https://imi.org.ua/" : "https://imi.org.ua/en/"],
    ] as Array<[string, string]>
  ).filter(([, u]) => !!u);
  return (
    <section className="section section--about" id="methodology" aria-labelledby="about-title">
      <div className="shell">
        <div className="about">
          <div className="about__intro">
            <h2 id="about-title" className="section__title">
              {m.title}
            </h2>
            <blockquote className="about__quote">
              <p>{m.quote}</p>
              <footer>{m.quoteBy}</footer>
            </blockquote>
            <p className="about__legal">
              <b>{m.legalTitle}.</b> {m.legal}
            </p>
            {data.texts.editorNote[locale] && (
              <p className="about__legal" style={{ whiteSpace: "pre-line" }}>
                <b>{m.editorNote}.</b> {data.texts.editorNote[locale]}
              </p>
            )}
          </div>
          <ul className="about__facts">
            {facts.map((f) => (
              <li key={f.title}>
                <Glyph name={f.icon} className="about__icon" />
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="sources">
          <ul className="sources__list">
            {sources.map(([label, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener">
                  <span className="sources__label">{label}</span>
                  <span className="sources__host">{new URL(url).host.replace(/^www\./, "")}</span>
                  <Glyph name="external" className="sources__arrow" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

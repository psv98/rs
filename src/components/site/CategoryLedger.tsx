import type { CSSProperties } from "react";
import { visibleCategories, categorySum, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { withBase } from "@/lib/site";
import { groupDigits } from "@/lib/viz/geometry";
import { LedgerReveal } from "./LedgerReveal";

export const categoryAnchor = (id: string) => `category-${id}`;


export function CategoryLedger({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const d = t(locale);
  const data = snap.data;
  const cats = visibleCategories(data);
  const sum = categorySum(data);
  const n = cats.length;
  const span = (cols: number) => (n % cols === 0 ? cols : cols - (n % cols));
  const noteStyle = { "--span2": span(2), "--span3": span(3), "--span4": span(4) } as CSSProperties;
  const k = data.casualties;
  const mismatch = sum !== data.totalCrimes;
  return (
    <section className="section section--cats" aria-labelledby="types-title">
      <div className="shell">
        <header className="section__head">
          <h2 id="types-title" className="section__title">
            {d.categories.title}
          </h2>
          <p className="section__lead">{d.categories.lead}</p>
        </header>
        <LedgerReveal className="cats" label={d.categories.title}>
          {cats.map((c, i) => {
            const anchor = categoryAnchor(c.id);
            return (
              <article
                key={c.id}
                id={anchor}
                className="cat"
                role="listitem"
                aria-labelledby={`${anchor}-name`}
                style={{ "--i": i, "--icon": `url("${withBase(`/icons/categories/${c.iconId}.svg`)}")` } as CSSProperties}
              >
                <div className="cat__top">
                  <span className="cat__icon" aria-hidden="true" />
                </div>
                <p className="cat__value">
                  {groupDigits(c.value)}
                  {c.id === "killings" && k.killedTotal !== null && (
                    <a className="cat__sup" href={`#${anchor}-note`} aria-label={d.categories.killedFootnote(k.killedTotal, k.killedOnDuty)}>
                      ({groupDigits(k.killedTotal)})*
                    </a>
                  )}
                </p>
                <h3 className="cat__name" id={`${anchor}-name`}>
                  {c.name[locale]}
                </h3>
                {c.id === "killings" && k.killedTotal !== null && (
                  <p className="cat__note" id={`${anchor}-note`}>
                    * {d.categories.killedFootnote(k.killedTotal, k.killedOnDuty)}
                  </p>
                )}
                {c.description[locale] && (
                  <details className="cat__more">
                    <summary>{d.categories.more}</summary>
                    <p>{c.description[locale]}</p>
                  </details>
                )}
              </article>
            );
          })}
          <div className="cat cat--note" role="listitem" style={noteStyle}>
            <h3 className="cat__name">{d.categories.sumNoteTitle}</h3>
            <p className="cat__sum">
              <span>{groupDigits(sum)}</span>
              <span aria-hidden="true">{mismatch ? "≠" : "="}</span>
              <span>{groupDigits(data.totalCrimes)}</span>
            </p>
            <p className="cat__note">
              {mismatch ? d.categories.sumNote(sum, data.totalCrimes) : d.categories.sumMatches(sum)}{" "}
              {mismatch && data.verification.sumMismatchConfirmed && data.verification.sumMismatchExplanation[locale]}
            </p>
          </div>
        </LedgerReveal>
      </div>
    </section>
  );
}

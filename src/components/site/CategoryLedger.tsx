import type { CSSProperties } from "react";
import {
  visibleCategories,
  categorySum,
  type Locale,
  type PublicSnapshot,
} from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { withBase } from "@/lib/site";
import { groupDigits } from "@/lib/viz/geometry";
import { LedgerReveal } from "./LedgerReveal";

export const categoryAnchor = (id: string) => `category-${id}`;

export function CategoryLedger({
  locale,
  snap,
}: {
  locale: Locale;
  snap: PublicSnapshot;
}) {
  const d = t(locale);
  const data = snap.data;
  const cats = visibleCategories(data);
  const sum = categorySum(data);
  const n = cats.length;
  const k = data.casualties;
  const mismatch = sum !== data.totalCrimes;
  // The grid has 12 tracks. A card takes 12/cols of them; the cards of an incomplete last
  // row share the whole row, so it never ends with a gap. The sum note is shown only when
  // the categories do not add up to the total, as its own full row.
  const tail = (i: number, cols: number) => {
    const r = n % cols;
    return r && i >= n - r ? 12 / r : 12 / cols;
  };
  return (
    <section
      className="section section--cats section--glow"
      aria-labelledby="types-title"
    >
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
                style={
                  {
                    "--i": i,
                    "--icon": `url("${withBase(`/icons/categories/${c.iconId}.svg`)}")`,
                    "--s2": tail(i, 2),
                    "--s3": tail(i, 3),
                    "--s4": tail(i, 4),
                  } as CSSProperties
                }
              >
                <div className="cat__top">
                  <span className="cat__icon" aria-hidden="true" />
                </div>
                <p className="cat__value">
                  <span className="cat__num" data-count={c.value}>
                    {groupDigits(c.value)}
                  </span>
                  {c.id === "killings" && k.killedTotal !== null && (
                    <a
                      className="cat__sup"
                      href={`#${anchor}-note`}
                      aria-label={d.categories.killedFootnote(
                        k.killedTotal,
                        k.killedOnDuty,
                      )}
                    >
                      ({groupDigits(k.killedTotal)})*
                    </a>
                  )}
                </p>
                <h3 className="cat__name" id={`${anchor}-name`}>
                  {c.name[locale]}
                </h3>
                {c.id === "killings" && k.killedTotal !== null && (
                  <p className="cat__note" id={`${anchor}-note`}>
                    *{" "}
                    {d.categories.killedFootnote(k.killedTotal, k.killedOnDuty)}
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
          {mismatch && (
            <div className="cat cat--note" role="listitem">
              <h3 className="cat__name">{d.categories.sumNoteTitle}</h3>
              <p className="cat__sum">
                <span>{groupDigits(sum)}</span>
                <span aria-hidden="true">{mismatch ? "≠" : "="}</span>
                <span>{groupDigits(data.totalCrimes)}</span>
              </p>
              <p className="cat__note">
                {d.categories.sumNote(sum, data.totalCrimes)}{" "}
                {data.verification.sumMismatchConfirmed &&
                  data.verification.sumMismatchExplanation[locale]}
              </p>
            </div>
          )}
        </LedgerReveal>
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";
import { visibleCategories, categorySum, type Locale, type PublicSnapshot } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { CategoryIcon } from "../ui/CategoryIcon";
import { LedgerReveal } from "./LedgerReveal";
import { CopyLink } from "./CopyLink";

export const categoryAnchor = (id: string) => `category-${id}`;

export function CategoryLedger({ locale, snap }: { locale: Locale; snap: PublicSnapshot }) {
  const d = t(locale);
  const data = snap.data;
  const cats = visibleCategories(data);
  const sum = categorySum(data);
  const max = Math.max(1, ...cats.map((c) => c.value));
  const fmt = (n: number) => new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB").format(n).replace(/ /g, " ");
  const n = cats.length;
  // The closing note fills the rest of the last row at every breakpoint.
  const span = (cols: number) => (n % cols === 0 ? cols : cols - (n % cols));
  const noteStyle = { "--span2": span(2), "--span3": span(3), "--span4": span(4), "--span1": 1 } as CSSProperties;
  const k = data.casualties;
  const mismatch = sum !== data.totalCrimes;
  return (
    <section className="section" aria-labelledby="types-title">
      <div className="shell">
        <div className="section__head">
          <h2 id="types-title" className="section__title">
            {d.categories.title}
          </h2>
          <p className="section__lead">{d.categories.lead}</p>
        </div>
        <LedgerReveal className="ledger" label={d.categories.title}>
          {cats.map((c, i) => {
            const mag = Math.log(c.value + 1) / Math.log(max + 1);
            const anchor = categoryAnchor(c.id);
            return (
              <article
                key={c.id}
                id={anchor}
                className="cell"
                role="listitem"
                aria-labelledby={`${anchor}-name`}
                style={{ "--i": i, "--mag": mag.toFixed(3), "--share": (c.value / max).toFixed(3) } as CSSProperties}
              >
                <div className="cell__top">
                  <CategoryIcon id={c.iconId} className="cell__icon" />
                  <p className="cell__value">
                    {fmt(c.value)}
                    {c.id === "killings" && k.killedTotal !== null && (
                      <sup>
                        <a href={`#${anchor}-note`} aria-label={d.categories.killedFootnote(k.killedTotal, k.killedOnDuty)}>
                          ({fmt(k.killedTotal)})*
                        </a>
                      </sup>
                    )}
                  </p>
                </div>
                <h3 className="cell__name" id={`${anchor}-name`}>
                  {c.name[locale]}
                </h3>
                {c.id === "killings" && k.killedTotal !== null && (
                  <p className="cell__note" id={`${anchor}-note`}>
                    * {d.categories.killedFootnote(k.killedTotal, k.killedOnDuty)}
                  </p>
                )}
                <div className="cell__bar" title={d.categories.share}>
                  <span />
                </div>
                <div className="cell__tools">
                  {c.description[locale] ? (
                    <details>
                      <summary>{d.categories.more}</summary>
                      <p>{c.description[locale]}</p>
                    </details>
                  ) : (
                    <span />
                  )}
                  <CopyLink anchor={anchor} label={d.categories.copyLink} doneLabel={d.categories.linkCopied} />
                </div>
              </article>
            );
          })}
          <div className="cell cell--note" role="listitem" style={noteStyle}>
            <h3>{d.categories.sumNoteTitle}</h3>
            <p className="sum">
              {fmt(sum)} {mismatch ? "≠" : "="} {fmt(data.totalCrimes)}
            </p>
            <p>
              {mismatch ? d.categories.sumNote(sum, data.totalCrimes) : d.categories.sumMatches(sum)}{" "}
              {mismatch && data.verification.sumMismatchConfirmed && data.verification.sumMismatchExplanation[locale]}{" "}
              <a className="link" href="#methodology">
                {d.nav.methodology}
              </a>
            </p>
          </div>
        </LedgerReveal>
      </div>
    </section>
  );
}

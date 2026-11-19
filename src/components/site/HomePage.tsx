import { planSlides } from "@/lib/export/plan";
import type { Locale } from "@/lib/data/schema";
import type { PublicState } from "@/lib/data/public-types";
import { t } from "@/lib/i18n/dictionaries";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Ticker } from "./Ticker";
import { CategoryLedger } from "./CategoryLedger";
import { Analytics, type AnalyticsInitial } from "./Analytics";
import { History } from "./History";
import { Methodology } from "./Methodology";
import { ExportPanel } from "./ExportPanel";
import { Footer } from "./Footer";

export type ExportMode = { kind: "public" } | { kind: "admin"; id: number };

export function HomePage({
  locale,
  state,
  initial,
  siteUrl,
  exportMode = { kind: "public" },
  banner,
  ukPath,
  enPath,
}: {
  locale: Locale;
  state: PublicState;
  initial: AnalyticsInitial;
  siteUrl: string;
  exportMode?: ExportMode;
  banner?: string;
  ukPath?: string;
  enPath?: string;
}) {
  const d = t(locale);
  const snap = state.current;
  if (!snap) {
    return (
      <>
        {banner && <div className="preview-banner">{banner}</div>}
        <Header locale={locale} ukPath={ukPath} enPath={enPath} />
        <main id="main" className="shell section" style={{ minHeight: "60vh" }}>
          <h1 className="section__title">{d.empty.title}</h1>
          <p className="section__lead" style={{ marginTop: "1rem" }}>
            {d.empty.text}{" "}
            <a className="link" href="https://imi.org.ua/russias-crimes">
              imi.org.ua/russias-crimes
            </a>
          </p>
        </main>
        <Footer locale={locale} />
      </>
    );
  }
  const v = snap.checksum.slice(0, 10);
  const url = (f: "social" | "wide", s: number, dl: boolean) =>
    exportMode.kind === "public"
      ? `/api/export/${f}?lang=${locale}&slide=${s}&v=${v}${dl ? "&download=1" : ""}`
      : `/api/admin/export?id=${exportMode.id}&format=${f}&lang=${locale}&slide=${s}&v=${v}`;
  const slides = (f: "social" | "wide") => planSlides(snap.data, f).map((p) => ({ src: url(f, p.index, false), download: url(f, p.index, true) }));
  const links = {
    social: slides("social"),
    wide: slides("wide"),
    socialZip: exportMode.kind === "public" ? `/api/export/zip?lang=${locale}&set=social&v=${v}` : null,
    allZip: exportMode.kind === "public" ? `/api/export/zip?lang=${locale}&set=all&v=${v}` : null,
  };
  return (
    <>
      {banner && <div className="preview-banner">{banner}</div>}
      <Header locale={locale} ukPath={ukPath} enPath={enPath} />
      <main id="main">
        <Hero locale={locale} snap={snap} siteUrl={siteUrl} />
        <Ticker locale={locale} snap={snap} />
        <CategoryLedger locale={locale} snap={snap} />
        <section className="section" id="analytics" aria-labelledby="analytics-title">
          <div className="shell">
            <div className="section__head">
              <h2 id="analytics-title" className="section__title">
                {d.analytics.title}
              </h2>
              <p className="section__lead">{d.analytics.lead}</p>
            </div>
            <Analytics locale={locale} history={state.history} initial={initial} />
          </div>
        </section>
        <History locale={locale} history={state.history} initialYear={initial.year} />
        <section className="section" id="export" aria-labelledby="export-title">
          <div className="shell">
            <div className="section__head">
              <h2 id="export-title" className="section__title">
                {d.exportBlock.title}
              </h2>
              <p className="section__lead">{d.exportBlock.lead}</p>
            </div>
            <ExportPanel locale={locale} links={links} />
          </div>
        </section>
        <Methodology locale={locale} snap={snap} />
      </main>
      <Footer locale={locale} />
    </>
  );
}

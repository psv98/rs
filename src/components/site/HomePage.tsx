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
import { ExportPanel, type ExportLinks } from "./ExportPanel";
import { Footer } from "./Footer";

export type ExportMode = { kind: "public" } | { kind: "admin"; id: number };
import { IS_STATIC, withBase } from "@/lib/site";

export function HomePage({
  locale,
  state,
  initial = { year: null, s: null, cmp: null, cat: null },
  siteUrl,
  exportMode = { kind: "public" },
  banner,
  ukPath,
  enPath,
}: {
  locale: Locale;
  state: PublicState;
  initial?: AnalyticsInitial;
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
  if (IS_STATIC && exportMode.kind === "public") {
    // GitHub Pages: files pre-rendered by scripts/render-static-exports.ts
    const file = (f: "social" | "wide", p: { index: number; count: number }) => {
      const src = withBase(`/exports/${locale}/${f}-${p.index}.png?v=${v}`);
      return { src, download: src, filename: `imi-russias-crimes_${snap.data.asOfDate}_${locale}_${f === "social" ? "1080x1350" : "1920x1080"}${p.count > 1 ? `_${p.index}-of-${p.count}` : ""}.png` };
    };
    const staticLinks = {
      social: planSlides(snap.data, "social").map((p) => file("social", p)),
      wide: planSlides(snap.data, "wide").map((p) => file("wide", p)),
      socialZip: withBase(`/exports/${locale}/slides-1080x1350.zip?v=${v}`),
      allZip: withBase(`/exports/${locale}/all-slides.zip?v=${v}`),
    };
    return renderPage(staticLinks);
  }
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
  return renderPage(links);

  function renderPage(links: ExportLinks) {
  if (!snap) return null;
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
}

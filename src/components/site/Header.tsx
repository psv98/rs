import type { Locale } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, withBase } from "@/lib/site";
import { LanguageSwitch } from "./LanguageSwitch";

export function Header({ locale, ukPath, enPath }: { locale: Locale; ukPath?: string; enPath?: string }) {
  const d = t(locale);
  ukPath ??= pageHref("uk");
  enPath ??= pageHref("en");
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        {d.skipToContent}
      </a>
      <div className="shell site-header__row">
        <a className="site-header__logo" href={pageHref(locale)} aria-label={d.org}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBase(`/brand/imi-logo-${locale}.svg`)} alt={d.org} width={108} height={39} />
        </a>
        <div className="site-header__project">
          <b>{d.projectKicker}</b>
          <span>{d.projectKickerSub}</span>
        </div>
        <nav className="site-nav" aria-label={locale === "uk" ? "Розділи сторінки" : "Page sections"}>
          <a className="navlink" href="#stats">{d.nav.stats}</a>
          <a className="navlink" href="#analytics">{d.nav.analytics}</a>
          <a className="navlink" href="#history">{d.nav.history}</a>
          <a className="navlink" href="#export">{d.nav.export}</a>
          <a className="navlink" href="#methodology">{d.nav.methodology}</a>
          <LanguageSwitch locale={locale} label={d.langSwitch} ukPath={ukPath} enPath={enPath} />
        </nav>
      </div>
    </header>
  );
}

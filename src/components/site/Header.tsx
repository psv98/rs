import type { Locale } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, withBase } from "@/lib/site";
import { LanguageSwitch } from "./LanguageSwitch";
import { SectionSpy } from "./SectionSpy";

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
          <img src={withBase(`/brand/imi-logo-${locale}.svg`)} alt={d.org} width={133} height={48} />
        </a>
        <nav className="site-nav" aria-label={locale === "uk" ? "Розділи сторінки" : "Page sections"}>
          <div className="site-nav__links">
            <a className="navlink" href="#types-title"><span>{d.nav.stats}</span></a>
            <a className="navlink" href="#dynamics"><span>{d.nav.dynamics}</span></a>
            <a className="navlink" href="#export"><span>{d.nav.export}</span></a>
            <a className="navlink" href="#methodology"><span>{d.nav.methodology}</span></a>
          </div>
          <LanguageSwitch locale={locale} label={d.langSwitch} ukPath={ukPath} enPath={enPath} />
        </nav>
        <SectionSpy />
      </div>
    </header>
  );
}

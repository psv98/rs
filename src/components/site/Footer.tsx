import type { Locale } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { pageHref, withBase } from "@/lib/site";

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale);
  return (
    <footer className="site-footer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="site-footer__mark" src={withBase("/brand/favicon.svg")} alt="" aria-hidden="true" />
      <div className="shell site-footer__row">
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBase(`/brand/imi-logo-${locale}.svg`)} alt={d.org} width={124} height={44} />
          <p>{d.footer.monitoring}</p>
          <p>{d.footer.rights}</p>
        </div>
        <nav aria-label={locale === "uk" ? "Посилання" : "Links"}>
          <a href={locale === "uk" ? "https://imi.org.ua/" : "https://imi.org.ua/en/"} rel="noopener">
            {d.footer.site}
          </a>
          <a href="#methodology">{d.nav.methodology}</a>
          <a href={pageHref(locale, "/present")}>{d.share.present}</a>
          <a href={pageHref(locale === "uk" ? "en" : "uk")} hrefLang={locale === "uk" ? "en" : "uk"}>
            {locale === "uk" ? "English" : "Українська"}
          </a>
          <span style={{ color: "var(--color-ash-2)" }}>© {new Date().getFullYear()} {d.org}</span>
        </nav>
      </div>
    </footer>
  );
}

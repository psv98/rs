import type { Locale } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { withBase } from "@/lib/site";

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale);
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <a href={locale === "uk" ? "https://imi.org.ua/" : "https://imi.org.ua/en/"} rel="noopener" className="site-footer__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBase(`/brand/imi-logo-${locale}.svg`)} alt={d.org} width={150} height={53} />
        </a>
        <p className="site-footer__rights">{d.footer.rights}</p>
      </div>
    </footer>
  );
}

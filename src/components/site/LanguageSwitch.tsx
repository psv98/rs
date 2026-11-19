"use client";
import Link from "next/link";
import type { Locale } from "@/lib/data/schema";
import { BASE_PATH } from "@/lib/site";

/** next/link adds the base path itself, so it is stripped from the given hrefs. */
const route = (href: string) => (BASE_PATH && href.startsWith(BASE_PATH) ? href.slice(BASE_PATH.length) || "/" : href);

/**
 * Switches / ↔ /en as a client-side transition: no page reload, the scroll position is
 * kept, and only the page content is swapped.
 */
export function LanguageSwitch({ locale, label, ukPath, enPath }: { locale: Locale; label: string; ukPath: string; enPath: string }) {
  return (
    <nav className="lang-switch" aria-label={label}>
      <Link href={route(ukPath)} hrefLang="uk" lang="uk" scroll={false} aria-current={locale === "uk" ? "true" : undefined}>
        <span>UA</span>
      </Link>
      <Link href={route(enPath)} hrefLang="en" lang="en" scroll={false} aria-current={locale === "en" ? "true" : undefined}>
        <span>EN</span>
      </Link>
    </nav>
  );
}

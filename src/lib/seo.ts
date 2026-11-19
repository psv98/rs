import "server-only";
import type { Metadata } from "next";
import type { Locale } from "./data/schema";
import { getPublicState } from "./data/public";
import { formatLongDate, isValidIsoDate } from "./data/dates-server";
import { t } from "./i18n/dictionaries";
import { config } from "./config";

export async function pageMetadata(locale: Locale, path: "" | "/present" = ""): Promise<Metadata> {
  const { current } = await getPublicState();
  const d = t(locale).meta;
  const title = current ? d.title(current.data.totalCrimes) : d.fallbackTitle;
  const description = current ? d.description(current.data.totalCrimes, formatLongDate(current.data.asOfDate, locale)) : d.fallbackDescription;
  const base = config.siteUrl;
  const isStatic = process.env.STATIC_EXPORT === "1";
  const slash = isStatic ? "/" : "";
  const ukUrl = `${base}${path ? `${path}${slash}` : "/"}`;
  const enUrl = `${base}/en${path}${slash}`;
  const v = current?.checksum.slice(0, 10) ?? "0";
  const og = isStatic ? `${base}/exports/${locale}/og.png?v=${v}` : `${base}/api/og?lang=${locale}&v=${v}`;
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: locale === "uk" ? ukUrl : enUrl, languages: { uk: ukUrl, en: enUrl, "x-default": ukUrl } },
    openGraph: {
      type: "website",
      siteName: t(locale).org,
      locale: locale === "uk" ? "uk_UA" : "en_GB",
      alternateLocale: locale === "uk" ? ["en_GB"] : ["uk_UA"],
      url: locale === "uk" ? ukUrl : enUrl,
      title,
      description,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
    robots: path === "/present" ? { index: false, follow: true } : { index: true, follow: true },
  };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Validates URL filters (never trusted as-is). */
export function parseFilters(sp: SP) {
  const y = Number.parseInt(one(sp.year) ?? "", 10);
  const s = one(sp.s);
  const cmp = one(sp.cmp);
  const cat = one(sp.cat);
  return {
    year: Number.isInteger(y) && y >= 2022 && y <= 2100 ? y : null,
    s: s && isValidIsoDate(s) ? s : null,
    cmp: cmp === "none" ? "none" : cmp && isValidIsoDate(cmp) ? cmp : null,
    cat: cat && /^[a-z0-9-]{2,48}$/.test(cat) ? cat : null,
  };
}

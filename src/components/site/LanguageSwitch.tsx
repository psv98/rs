"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/data/schema";

/** Switches /  ↔  /en keeping the current filters (?query) and anchor (#hash). */
export function LanguageSwitch({ locale, label, ukPath, enPath }: { locale: Locale; label: string; ukPath: string; enPath: string }) {
  const [suffix, setSuffix] = useState("");
  useEffect(() => {
    const update = () => setSuffix(window.location.search + window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("imi:urlchange", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("imi:urlchange", update);
    };
  }, []);
  return (
    <nav className="lang-switch" aria-label={label}>
      <a href={ukPath + suffix} hrefLang="uk" lang="uk" aria-current={locale === "uk" ? "true" : undefined}>
        UA
      </a>
      <a href={enPath + suffix} hrefLang="en" lang="en" aria-current={locale === "en" ? "true" : undefined}>
        EN
      </a>
    </nav>
  );
}

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { RootDocument } from "@/components/site/RootDocument";
import { LangSync } from "@/components/site/LangSync";
import { CopyCredit } from "@/components/site/CopyCredit";
import { IS_STATIC } from "@/lib/site";

/** One root layout for UA and EN, so the language switch does not reload the page. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  // Server mode: the proxy tells us the locale of the requested path. Static mode: the
  // build script rewrites <html lang> in the exported English pages.
  const lang = IS_STATIC ? "uk" : (await headers()).get("x-imi-locale") === "en" ? "en" : "uk";
  return (
    <RootDocument lang={lang}>
      <LangSync />
      <CopyCredit />
      {children}
    </RootDocument>
  );
}

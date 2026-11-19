import type { ReactNode } from "react";
import localFont from "next/font/local";
import "@fontsource/overpass/400.css";
import "@fontsource/overpass/500.css";
import "@fontsource/overpass/600.css";
import "@fontsource/overpass/700.css";
import "../../app/globals.css";
import { withBase } from "@/lib/site";

// Used as delivered: the KyivType licence does not allow derivative files.
const kyiv = localFont({
  src: "../../app/fonts/KyivTypeSans-Bold.ttf",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-kyiv",
  preload: true,
});

/** Shared <html>/<body> for the UA, EN and admin root layouts. */
export function RootDocument({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang} className={kyiv.variable}>
      <head>
        <link rel="icon" href={withBase("/brand/favicon.svg")} type="image/svg+xml" />
        <meta name="theme-color" content="#0D0D14" />
      </head>
      <body>
        <div className="atmosphere" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

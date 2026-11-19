import type { ReactNode } from "react";
import "../../app/globals.css";

/** Shared <html>/<body> for the UA, EN and admin root layouts. */
export function RootDocument({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang}>
      <head>
        <link rel="preload" href="/fonts/KyivTypeSans-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#0D0D14" />
      </head>
      <body>
        <div className="atmosphere" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

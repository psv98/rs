"use client";
import { useState } from "react";
import type { Locale } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";
import { Glyph } from "../ui/Glyph";

export interface ExportLinks {
  social: Array<{ src: string; download: string; filename?: string }>;
  wide: Array<{ src: string; download: string; filename?: string }>;
  socialZip: string | null;
  allZip: string | null;
}

function Thumb({ src, href, caption, ratio, filename }: { src: string; href: string; caption: string; ratio: string; filename?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <a className="thumb" href={href} download={filename} data-loaded={loaded} aria-label={caption} style={{ aspectRatio: ratio }}>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={ratio === "1080 / 1350" ? 1080 : 1920} height={ratio === "1080 / 1350" ? 1350 : 1080} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} ref={(el) => { if (el?.complete && el.naturalWidth) setLoaded(true); }} />
        <figcaption>{caption}</figcaption>
      </figure>
    </a>
  );
}

export function ExportPanel({ locale, links }: { locale: Locale; links: ExportLinks }) {
  const d = t(locale).exportBlock;
  const socialCount = links.social.length;
  const wideCount = links.wide.length;
  return (
    <div className="exports">
      <div className="export-card">
        <h3>{d.socialCaption[0]} <span style={{ color: "var(--color-ash-2)", fontWeight: 500 }}>{d.socialCaption[1]}</span></h3>
        <div className="thumbs" style={{ ["--n" as string]: Math.min(socialCount, 3) }}>
          {links.social.map((l, i) => (
            <Thumb key={i} ratio="1080 / 1350" src={l.src} href={l.download} filename={l.filename} caption={socialCount > 1 ? d.slide(i + 1, socialCount) : "1080 × 1350"} />
          ))}
        </div>
        <div className="export-actions">
          <a className="btn btn--primary" href={socialCount > 1 && links.socialZip ? links.socialZip : links.social[0]?.download} download>
            <Glyph name="download" />
            {d.social}
          </a>
        </div>
      </div>
      <div className="export-card">
        <h3>{d.wideCaption[0]} <span style={{ color: "var(--color-ash-2)", fontWeight: 500 }}>{d.wideCaption[1]}</span></h3>
        <div className="thumbs" style={{ ["--n" as string]: 1 }}>
          {links.wide.map((l, i) => (
            <Thumb key={i} ratio="1920 / 1080" src={l.src} href={l.download} filename={l.filename} caption={wideCount > 1 ? d.slide(i + 1, wideCount) : "1920 × 1080"} />
          ))}
        </div>
        <div className="export-actions">
          <a className="btn" href={links.wide[0]?.download} download={links.wide[0]?.filename ?? true}>
            <Glyph name="download" />
            {d.wide}
          </a>
          {links.allZip && (
            <a className="btn" href={links.allZip} download>
              <Glyph name="download" />
              {d.all}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

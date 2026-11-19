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
  const Head = ({ caption, count, ratio }: { caption: [string, string]; count: number; ratio: string }) => (
    <header className="export-card__head">
      <span className="fmt-shape" style={{ aspectRatio: ratio }} aria-hidden="true" />
      <div>
        <h3>{caption[0]}</h3>
        <p>
          <b>{caption[1]}</b> px <span aria-hidden="true">/</span> {d.slidesCount(count)}
        </p>
      </div>
    </header>
  );
  return (
    <div className="exports">
      <div className="export-card">
        <Head caption={d.socialCaption} count={socialCount} ratio="1080 / 1350" />
        <div className="thumbs">
          {links.social.map((l, i) => (
            <Thumb key={i} ratio="1080 / 1350" src={l.src} href={l.download} filename={l.filename} caption={socialCount > 1 ? d.slide(i + 1, socialCount) : "1080 × 1350"} />
          ))}
        </div>
        <div className="export-actions">
          <a className="btn btn--primary" href={socialCount > 1 && links.socialZip ? links.socialZip : links.social[0]?.download} download>
            <Glyph name="download" />
            <span>{d.social}</span>
          </a>
        </div>
      </div>
      <div className="export-card">
        <Head caption={d.wideCaption} count={wideCount} ratio="1920 / 1080" />
        <div className="thumbs">
          {links.wide.map((l, i) => (
            <Thumb key={i} ratio="1920 / 1080" src={l.src} href={l.download} filename={l.filename} caption={wideCount > 1 ? d.slide(i + 1, wideCount) : "1920 × 1080"} />
          ))}
        </div>
        <div className="export-actions">
          <a className="btn btn--primary" href={links.wide[0]?.download} download={links.wide[0]?.filename ?? true}>
            <Glyph name="download" />
            <span>{d.wide}</span>
          </a>
          {links.allZip && (
            <a className="btn btn--primary" href={links.allZip} download>
              <Glyph name="download" />
              <span>{d.all}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

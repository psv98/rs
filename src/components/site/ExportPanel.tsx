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

type SavePicker = (o: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{
  createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>;
}>;

/**
 * Opens the system "Save as" window where the browser supports it (Chrome, Edge, Opera on
 * desktop). Other browsers use their usual download behaviour; Safari and Firefox ask
 * where to save if "Ask where to save each file" is on in their settings.
 */
function SaveButton({ href, name, label, ariaLabel }: { href?: string; name?: string; label: string; ariaLabel: string }) {
  if (!href) return null;
  const file = (name ?? href).split("/").pop()!.split("?")[0]!;
  return (
    <a
      className="btn btn--outline"
      href={href}
      download={file}
      aria-label={ariaLabel}
      onClick={async (e) => {
        const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
        if (!picker) return; // regular download
        e.preventDefault();
        const zip = file.endsWith(".zip");
        try {
          const handle = await picker({
            suggestedName: file,
            types: [zip ? { description: "ZIP", accept: { "application/zip": [".zip"] } } : { description: "PNG", accept: { "image/png": [".png"] } }],
          });
          const blob = await (await fetch(href)).blob();
          const w = await handle.createWritable();
          await w.write(blob);
          await w.close();
        } catch (err) {
          if ((err as Error).name !== "AbortError") window.location.href = href; // fall back to a normal download
        }
      }}
    >
      <Glyph name="download" />
      <span>{label}</span>
    </a>
  );
}

export function ExportPanel({ locale, links }: { locale: Locale; links: ExportLinks }) {
  const d = t(locale).exportBlock;
  const socialCount = links.social.length;
  const wideCount = links.wide.length;
  const Head = ({ caption, ratio }: { caption: [string, string]; ratio: string }) => (
    <header className="export-card__head">
      <span className="fmt-shape" style={{ aspectRatio: ratio }} aria-hidden="true" />
      <div>
        <h3>{caption[0]}</h3>
        <p>
          <b>{caption[1]}</b> px
        </p>
      </div>
    </header>
  );
  return (
    <div className="exports">
      <div className="export-card">
        <Head caption={d.socialCaption} ratio="1080 / 1350" />
        <div className="thumbs">
          {links.social.map((l, i) => (
            <Thumb key={i} ratio="1080 / 1350" src={l.src} href={l.download} filename={l.filename} caption={socialCount > 1 ? d.slide(i + 1, socialCount) : "1080 × 1350"} />
          ))}
        </div>
        <div className="export-actions">
          <SaveButton
            href={socialCount > 1 && links.socialZip ? links.socialZip : links.social[0]?.download}
            name={socialCount > 1 && links.socialZip ? links.social[0]?.filename?.replace(/(_\d+-of-\d+)?\.png$/, ".zip") : links.social[0]?.filename}
            label={d.save}
            ariaLabel={d.social}
          />
        </div>
      </div>
      <div className="export-card">
        <Head caption={d.wideCaption} ratio="1920 / 1080" />
        <div className="thumbs">
          {links.wide.map((l, i) => (
            <Thumb key={i} ratio="1920 / 1080" src={l.src} href={l.download} filename={l.filename} caption={wideCount > 1 ? d.slide(i + 1, wideCount) : "1920 × 1080"} />
          ))}
        </div>
        <div className="export-actions">
          <SaveButton href={links.wide[0]?.download} name={links.wide[0]?.filename ?? links.wide[0]?.download} label={d.save} ariaLabel={d.wide} />
        </div>
      </div>
    </div>
  );
}

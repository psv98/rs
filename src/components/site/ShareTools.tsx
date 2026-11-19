"use client";
import { useState } from "react";
import { Glyph } from "../ui/Glyph";

export function ShareTools({
  statsText,
  labels,
  presentHref,
  title,
}: {
  statsText: string;
  labels: { copyStats: string; copied: string; share: string; present: string };
  presentHref: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(statsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(labels.copyStats, statsText);
    }
  };
  const share = async () => {
    const url = window.location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, text: statsText, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };
  return (
    <div className="hero__actions">
      <button type="button" className="btn btn--primary" onClick={copy} data-done={copied}>
        <Glyph name={copied ? "check" : "copy"} />
        <span aria-live="polite">{copied ? labels.copied : labels.copyStats}</span>
      </button>
      <button type="button" className="btn" onClick={share}>
        <Glyph name="share" />
        {labels.share}
      </button>
      <a className="btn" href={presentHref}>
        <Glyph name="screen" />
        {labels.present}
      </a>
    </div>
  );
}

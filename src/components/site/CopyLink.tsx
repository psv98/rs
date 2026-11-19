"use client";
import { useState } from "react";
import { Glyph } from "../ui/Glyph";

export function CopyLink({ anchor, label, doneLabel }: { anchor: string; label: string; doneLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={done ? doneLabel : label}
      title={done ? doneLabel : label}
      onClick={async () => {
        const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.location.hash = anchor;
        }
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      <Glyph name={done ? "check" : "link"} />
    </button>
  );
}

"use client";
import { Glyph } from "../ui/Glyph";

export function FullscreenButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn btn--lg"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      }}
    >
      <Glyph name="screen" />
      <span>{label}</span>
    </button>
  );
}

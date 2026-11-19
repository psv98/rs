"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A fixed 1920×1080 canvas scaled to fit the window, so presentation mode always shows
 * everything on one screen and shrinks or grows in proportion (13", 14", 16" laptops,
 * projectors, TVs).
 */
export const STAGE = { w: 1920, h: 1080 } as const;

export function PresentStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const s = Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h);
      el.style.setProperty("--stage-scale", String(s));
    };
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("fullscreenchange", fit);
    };
  }, []);
  return (
    <div className="stage-viewport">
      <div ref={ref} className="stage" style={{ width: STAGE.w, height: STAGE.h }}>
        {children}
      </div>
    </div>
  );
}

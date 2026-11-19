"use client";
import { useEffect, useRef } from "react";

/**
 * The server renders the final number (no-JS, SEO, screen readers). On the client,
 * if motion is allowed, it counts up once from ~60 % to the published value.
 * It never increases beyond the published figure.
 */
export function CountUp({ value, locale }: { value: number; locale: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fmt = new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB");
    const from = Math.round(value * 0.6);
    const duration = 1500;
    let start: number | null = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(Math.round(from + (value - from) * eased)).replace(/ /g, " ");
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = fmt.format(value).replace(/ /g, " ");
    };
  }, [value, locale]);
  return (
    <span ref={ref} aria-hidden="true">
      {new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB").format(value).replace(/ /g, " ")}
    </span>
  );
}

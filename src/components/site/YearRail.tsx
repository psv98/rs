"use client";
import { useEffect, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/data/schema";
import { t } from "@/lib/i18n/dictionaries";

/** 2022 → 2027: a real sequence. Years without published snapshots are shown as such, never filled in. */
export function YearRail({ locale, counts, years, currentYear, initialYear }: { locale: Locale; counts: Record<number, number>; years: number[]; currentYear: number; initialYear: number | null }) {
  const d = t(locale).history;
  const [active, setActive] = useState<number | null>(initialYear);
  useEffect(() => {
    const on = (e: Event) => setActive((e as CustomEvent<number | null>).detail);
    window.addEventListener("imi:year", on);
    return () => window.removeEventListener("imi:year", on);
  }, []);
  return (
    <ol className="rail" style={{ "--years": years.length } as CSSProperties}>
      {years.map((y) => {
        const n = counts[y] ?? 0;
        const state = y > currentYear ? "future" : n > 0 ? "data" : "empty";
        const status = state === "future" ? d.yearFuture : n > 0 ? d.yearHasData(n) : d.yearNoData;
        const content = (
          <>
            <span className="dot" aria-hidden="true" />
            <span className="y">{y}</span>
            <span className="s">{status}</span>
          </>
        );
        return (
          <li key={y}>
            {state === "data" ? (
              <a
                href={`?year=${y}#analytics`}
                data-state={state}
                aria-current={active === y ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(y);
                  window.dispatchEvent(new CustomEvent("imi:year", { detail: y }));
                  document.getElementById("analytics")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                }}
              >
                {content}
              </a>
            ) : (
              <span className="year" data-state={state} aria-disabled="true">
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

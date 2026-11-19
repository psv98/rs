import type { CSSProperties } from "react";
import { warMonths } from "@/lib/data/war";

/** Duration of the full-scale war as month marks grouped by year; the last mark is the reporting month. */
export function WarTimeline({ label, start, end, className }: { label: string; start: string; end: string; className?: string }) {
  const groups = warMonths(start, end);
  const total = groups.reduce((s, g) => s + g.months, 0);
  let n = 0;
  return (
    <div className={`warline ${className ?? ""}`}>
      <p className="warline__label">{label}</p>
      <div className="warline__years" aria-hidden="true">
        {groups.map((g) => (
          <div key={g.year} className="warline__year" style={{ "--m": g.months } as CSSProperties}>
            <div className="warline__ticks">
              {Array.from({ length: g.months }, () => {
                const idx = n++;
                return <span key={idx} data-now={idx === total - 1 || undefined} style={{ "--k": idx } as CSSProperties} />;
              })}
            </div>
            <span className="warline__yr">{g.year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

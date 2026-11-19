import type { CSSProperties } from "react";
import { groupDigits } from "@/lib/viz/geometry";

/**
 * Mechanical-counter digits. The final number is in the HTML (no JS needed); CSS rolls
 * each column from 0 to its digit once (keyframes define only `from`). Reduced motion: static.
 */
export function Odometer({ value, className }: { value: number; className?: string }) {
  const chars = [...groupDigits(value)];
  let i = 0;
  return (
    <span className={`odo ${className ?? ""}`} aria-hidden="true" style={{ "--digits": String(value).length } as CSSProperties}>
      {chars.map((ch, k) => {
        if (!/\d/.test(ch)) return <span key={k} className="odo__sep" />;
        const d = Number(ch);
        const idx = i++;
        return (
          <span key={k} className="odo__win">
            <span className="odo__col" style={{ "--d": d, "--i": idx } as CSSProperties}>
              {"0123456789".split("").map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

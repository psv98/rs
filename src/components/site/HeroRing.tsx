"use client";
import { useState, type CSSProperties } from "react";
import { RING, ringTicks, ringWedges, groupDigits } from "@/lib/viz/geometry";
import { CATEGORY_ICONS, CATEGORY_ICON_VIEWBOX, type CategoryIconId } from "@/lib/icons/category-icons.generated";
import { withBase } from "@/lib/site";
import { Odometer } from "./Odometer";

export interface RingCategory {
  id: string;
  iconId: string;
  value: number;
  name: string;
}

/**
 * Hero visual: one sector per category around the headline figure. Sector area grows
 * with the number of cases. Hover / focus a sector to see the category in the centre.
 */
export function HeroRing({
  total,
  categories,
  label,
  caption,
  ariaLabel,
}: {
  total: number;
  categories: RingCategory[];
  label: string;
  caption: string;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const wedges = ringWedges(categories);
  const cur = categories.find((c) => c.id === active) ?? null;
  const S = RING.size;
  const c = S / 2;
  return (
    <figure className="rose" style={{ "--digits": String(total).length } as CSSProperties}>
      <svg viewBox={`0 0 ${S} ${S}`} className="ring__svg" role="img" aria-label={ariaLabel}>
        <defs>
          <radialGradient id="ringHeat" cx={c} cy={c} r={RING.outer} gradientUnits="userSpaceOnUse">
            <stop offset={RING.inner / RING.outer} stopColor="#7a1424" />
            <stop offset={(RING.inner + 40) / RING.outer} stopColor="#c62f45" />
            <stop offset="0.86" stopColor="#ed4c5c" />
            <stop offset="1" stopColor="#ffb3ba" />
          </radialGradient>
          <radialGradient id="ringCore" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#1d1219" />
            <stop offset="1" stopColor="#0d0d14" />
          </radialGradient>
          <linearGradient id="ringSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ed4c5c" stopOpacity="0" />
            <stop offset="1" stopColor="#ffb3ba" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <g className="ring__dial">
          <path d={ringTicks(120, RING.outer + 6, RING.outer + 12)} stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
        </g>
        <circle cx={c} cy={c} r={RING.inner - 18} className="ring__orbit" />
        <g>
          {wedges.map((w) => (
            <path key={`t-${w.id}`} d={w.track} className="ring__track" />
          ))}
        </g>
        <g>
          {wedges.map((w) => {
            const cat = categories[w.index]!;
            return (
              <path
                key={w.id}
                d={w.path}
                className="ring__wedge"
                data-active={active === w.id || undefined}
                data-dim={active !== null && active !== w.id ? true : undefined}
                style={{ "--i": w.index } as CSSProperties}
                tabIndex={0}
                role="button"
                aria-label={`${cat.name}: ${groupDigits(cat.value)}`}
                onMouseEnter={() => setActive(w.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(w.id)}
                onBlur={() => setActive(null)}
                onClick={() => {
                  const el = document.getElementById(`category-${w.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
            );
          })}
        </g>
        {wedges.map((w) => {
          const cat = categories[w.index]!;
          const body = CATEGORY_ICONS[cat.iconId as CategoryIconId];
          return (
            <svg
              key={`i-${w.id}`}
              x={w.icon.x - 15}
              y={w.icon.y - 15}
              width="30"
              height="30"
              viewBox={CATEGORY_ICON_VIEWBOX}
              className="ring__icon"
              data-active={active === w.id || undefined}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: body ?? "" }}
            />
          );
        })}
        <circle cx={c} cy={c} r={RING.inner - 26} fill="url(#ringCore)" />
        <g className="ring__sweep" aria-hidden="true">
          <path d={`M${c} ${c}L${c} ${c - RING.outer}`} stroke="url(#ringSweep)" strokeWidth="2" />
        </g>
        <image href={withBase("/brand/favicon.svg")} x={c - 13} y={c + 92} width="26" height="26" opacity="0.9" />
      </svg>
      {/* Both layers stay mounted: the counter rolls once on load and is never re-mounted on hover. */}
      <div className="ring__center">
        <div className="ring__layer" data-hidden={cur ? true : undefined}>
          <Odometer value={total} className="ring__value" />
          <span className="sr-only">{groupDigits(total)}</span>
          <span className="ring__label">{label}</span>
          <span className="ring__caption">{caption}</span>
        </div>
        <div className="ring__layer ring__layer--cat" data-hidden={cur ? undefined : true} aria-live="polite">
          {cur && (
            <>
              <span key={cur.id} className="ring__value ring__value--cat">
                {groupDigits(cur.value)}
              </span>
              <span className="ring__label">{cur.name}</span>
            </>
          )}
        </div>
      </div>
    </figure>
  );
}

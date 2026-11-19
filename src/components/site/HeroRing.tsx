"use client";
import { useState, type CSSProperties } from "react";
import { RING, ringTicks, ringWedges, groupDigits } from "@/lib/viz/geometry";
import { CATEGORY_ICONS, CATEGORY_ICON_VIEWBOX, type CategoryIconId } from "@/lib/icons/category-icons.generated";
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
      {/* Decorative orbits: each is its own layer and only rotates (cheap to animate). */}
      <svg viewBox={`0 0 ${S} ${S}`} className="rose__fx rose__fx--ticks" aria-hidden="true">
        <path d={ringTicks(120, RING.outer + 6, RING.outer + 12)} stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" />
        <path d={ringTicks(12, RING.outer + 4, RING.outer + 16)} stroke="rgba(255,138,150,0.55)" strokeWidth="1.6" />
      </svg>
      <svg viewBox={`0 0 ${S} ${S}`} className="rose__fx rose__fx--comet" aria-hidden="true">
        <defs>
          <linearGradient id="cometTail" gradientUnits="userSpaceOnUse" x1={c} y1={c - 334} x2={c + 334} y2={c}>
            <stop offset="0" stopColor="#ffb3ba" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ed4c5c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r="334" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <path d={`M${c} ${c - 334} A334 334 0 0 1 ${c + 334} ${c}`} fill="none" stroke="url(#cometTail)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={c} cy={c - 334} r="4.5" fill="#ffd7db" />
      </svg>
      <svg viewBox={`0 0 ${S} ${S}`} className="rose__fx rose__fx--inner" aria-hidden="true">
        <circle cx={c} cy={c} r={RING.inner - 16} fill="none" stroke="rgba(237,76,92,0.45)" strokeWidth="1.2" strokeDasharray="3 7" />
        <path
          d={`M${c - (RING.inner - 16)} ${c} A${RING.inner - 16} ${RING.inner - 16} 0 0 1 ${c} ${c - (RING.inner - 16)}`}
          fill="none"
          stroke="#ff8a96"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
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

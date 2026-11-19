"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { niceMax, groupDigits } from "@/lib/viz/geometry";
import { withBase } from "@/lib/site";

export interface ChartPoint {
  date: string;
  total: number;
  killedTotal: number | null;
  note: string;
  source: string;
  current?: boolean;
  label: string; // formatted date
}

const W = 1200;
const H = 460;
const M = { l: 64, r: 96, t: 34, b: 46 };

const toDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

export function DynamicsChart({
  points,
  start,
  ariaLabel,
  labels,
}: {
  points: ChartPoint[];
  start: string;
  ariaLabel: string;
  labels: { killed: string; source: string; start: string; brand: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const end = points[points.length - 1]!.date;
  const d0 = toDay(start);
  const d1 = toDay(end);
  const yMax = niceMax(Math.max(...points.map((p) => p.total)));
  const x = (iso: string) => M.l + ((toDay(iso) - d0) / Math.max(1, d1 - d0)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / yMax) * (H - M.t - M.b);
  const firstYear = +start.slice(0, 4);
  const lastYear = +end.slice(0, 4);

  const { line, area } = useMemo(() => {
    const pts = [{ x: x(start), y: y(0) }, ...points.map((p) => ({ x: x(p.date), y: y(p.total) }))];
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
    const area = `${line}L${pts[pts.length - 1]!.x.toFixed(1)} ${y(0).toFixed(1)}L${pts[0]!.x.toFixed(1)} ${y(0).toFixed(1)}Z`;
    return { line, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, start, yMax]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setInView(true);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setInView(true), io.disconnect()), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ticks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  const yearEnds = new Set<number>();
  points.forEach((p, i) => {
    const next = points[i + 1];
    if (p.current || !next || next.date.slice(0, 4) !== p.date.slice(0, 4)) yearEnds.add(i);
  });
  const h = hover !== null ? points[hover] : null;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    points.forEach((p, i) => {
      const dd = Math.abs(x(p.date) - px);
      if (dd < bd) (bd = dd), (best = i);
    });
    setHover(best);
  };

  return (
    <div ref={ref} className="dyn" data-in={inView || undefined}>
      <svg viewBox={`0 0 ${W} ${H}`} className="dyn__svg" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id="dynArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ed4c5c" stopOpacity="0.42" />
            <stop offset="1" stopColor="#ed4c5c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dynLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a81d30" />
            <stop offset="0.6" stopColor="#ed4c5c" />
            <stop offset="1" stopColor="#ffb3ba" />
          </linearGradient>
        </defs>
        {/* year bands */}
        {Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).map((yr, i) => {
          const a = Math.max(x(`${yr}-01-01`), M.l);
          const b = Math.min(x(`${yr + 1}-01-01`), W - M.r);
          return (
            <g key={yr}>
              {i % 2 === 1 && <rect x={a} y={M.t} width={Math.max(0, b - a)} height={H - M.t - M.b} fill="rgba(255,255,255,0.025)" />}
              <text x={(a + b) / 2} y={H - 16} className="dyn__year">
                {yr}
              </text>
            </g>
          );
        })}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="dyn__grid" />
            <text x={M.l - 12} y={y(v) + 4} className="dyn__tick">
              {groupDigits(v)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#dynArea)" className="dyn__area" />
        <path d={line} fill="none" stroke="url(#dynLine)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="dyn__line" />
        {points.map((p, i) => {
          const end = yearEnds.has(i);
          return (
            <g key={p.date} className="dyn__pt" style={{ ["--i" as string]: i }}>
              <circle
                cx={x(p.date)}
                cy={y(p.total)}
                r={p.current ? 7 : end ? 5 : 3.2}
                className={p.current ? "dyn__dot dyn__dot--now" : p.note ? "dyn__dot dyn__dot--note" : "dyn__dot"}
                tabIndex={0}
                aria-label={`${p.label}: ${groupDigits(p.total)}${p.note ? `. ${p.note}` : ""}`}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
              {end && (
                <text x={x(p.date)} y={y(p.total) - (p.current ? 18 : 12)} className={p.current ? "dyn__val dyn__val--now" : "dyn__val"}>
                  {groupDigits(p.total)}
                </text>
              )}
            </g>
          );
        })}
        {h && (
          <line x1={x(h.date)} x2={x(h.date)} y1={M.t} y2={H - M.b} className="dyn__guide" />
        )}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        <g opacity="0.85">
          <image href={withBase("/brand/favicon.svg")} x={M.l + 8} y={M.t + 4} width="22" height="22" />
          <text x={M.l + 38} y={M.t + 20} className="dyn__brand">
            {labels.brand}
          </text>
        </g>
      </svg>
      {h && (
        <div className="dyn__tip" style={{ left: `${(x(h.date) / W) * 100}%`, top: `${(y(h.total) / H) * 100}%` }} role="status">
          <b>{groupDigits(h.total)}</b>
          <span>{h.label}</span>
          {h.killedTotal !== null && (
            <span>
              {labels.killed}: {groupDigits(h.killedTotal)}
            </span>
          )}
          {h.note && <em>{h.note}</em>}
        </div>
      )}
    </div>
  );
}

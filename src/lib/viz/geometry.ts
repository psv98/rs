/** Pure geometry shared by the web page (SVG) and the PNG renderer (Satori). */

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))] as const;
const f = (n: number) => Math.round(n * 100) / 100;

/** Annular sector from angle a0 to a1 (degrees, 0 = 12 o'clock, clockwise). */
export function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = pt(cx, cy, r1, a0);
  const [x2, y2] = pt(cx, cy, r1, a1);
  const [x3, y3] = pt(cx, cy, r0, a1);
  const [x4, y4] = pt(cx, cy, r0, a0);
  return `M${f(x1)} ${f(y1)}A${r1} ${r1} 0 ${large} 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r0} ${r0} 0 ${large} 0 ${f(x4)} ${f(y4)}Z`;
}

export interface RingWedge {
  id: string;
  value: number;
  index: number;
  path: string;
  track: string;
  mid: number;
  icon: { x: number; y: number };
  length: number;
}

export interface RingOptions {
  size: number;
  inner: number;
  outer: number;
  iconRadius: number;
  gapDeg: number;
  minLen: number;
}

export const RING: RingOptions = { size: 640, inner: 172, outer: 270, iconRadius: 302, gapDeg: 2.2, minLen: 12 };

/**
 * Radial bar chart: one equal-angle sector per category, radial length grows with value^0.62
 * (close to area-proportional, while keeping small categories readable).
 */
export function ringWedges(items: Array<{ id: string; value: number }>, o: RingOptions = RING): RingWedge[] {
  const n = Math.max(1, items.length);
  const step = 360 / n;
  const max = Math.max(1, ...items.map((c) => c.value));
  const c = o.size / 2;
  return items.map((it, i) => {
    const a0 = i * step + o.gapDeg / 2;
    const a1 = (i + 1) * step - o.gapDeg / 2;
    const len = o.minLen + (o.outer - o.inner - o.minLen) * Math.pow(it.value / max, 0.62);
    const mid = (a0 + a1) / 2;
    const [ix, iy] = pt(c, c, o.iconRadius, mid);
    return {
      id: it.id,
      value: it.value,
      index: i,
      path: sector(c, c, o.inner, o.inner + len, a0, a1),
      track: sector(c, c, o.inner, o.outer, a0, a1),
      mid,
      icon: { x: f(ix), y: f(iy) },
      length: len,
    };
  });
}

/** Dial ticks around the ring. */
export function ringTicks(count: number, r0: number, r1: number, size = RING.size): string {
  const c = size / 2;
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (360 / count) * i;
    const [x1, y1] = pt(c, c, r0, a);
    const [x2, y2] = pt(c, c, i % 5 === 0 ? r1 + 4 : r1, a);
    d += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
  }
  return d;
}

/** Unit visualisation: how many cases one dot stands for, so the largest category fits. */
export function dotUnit(values: number[], capacity: number): number {
  const max = Math.max(1, ...values);
  return Math.max(1, Math.ceil(max / capacity));
}

/** A "nice" upper bound for a chart axis (1000, 1200, 2500 …). */
export function niceMax(v: number): number {
  if (v <= 0) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * mag >= v * 1.04) return m * mag;
  return 10 * mag;
}

/** Group digits with a narrow no-break space: 1 234. */
export function groupDigits(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

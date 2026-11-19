"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");

/** Numbers roll up from zero once, as the cards appear. */
function countUp(root: HTMLElement) {
  const nums = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
  const start = performance.now();
  const dur = 1300;
  const targets = nums.map((n) => Number(n.dataset.count) || 0);
  nums.forEach((n) => (n.textContent = "0"));
  const tick = (now: number) => {
    let running = false;
    nums.forEach((n, i) => {
      const t = Math.min(1, Math.max(0, (now - start - 250 - i * 50) / dur));
      if (t < 1) running = true;
      const e = 1 - Math.pow(1 - t, 3);
      n.textContent = fmt(Math.round(targets[i]! * e));
    });
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** One-time staggered reveal of the ledger. Without JS (or with reduced motion) it is simply visible. */
export function LedgerReveal({ children, className, style, label }: { children: ReactNode; className: string; style?: CSSProperties; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // already on screen: no flash
    el.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("reveal-on");
          io.disconnect();
          countUp(el);
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={style} role="list" aria-label={label}>
      {children}
    </div>
  );
}

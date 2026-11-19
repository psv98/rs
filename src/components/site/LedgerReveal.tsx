"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

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

"use client";
import { useEffect } from "react";

/** Marks the header link of the section currently in view (aria-current). */
export function SectionSpy() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".site-nav a.navlink[href^='#']"));
    const targets = links
      .map((a) => {
        const el = document.getElementById(a.hash.slice(1));
        const section: Element = el?.closest("section") ?? el ?? document.body;
        return el ? { a, section } : null;
      })
      .filter((x): x is { a: HTMLAnchorElement; section: Element } => x !== null);
    if (!targets.length || !("IntersectionObserver" in window)) return;
    const visible = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
        let best: (typeof targets)[number] | null = null;
        let bestRatio = 0;
        for (const t of targets) {
          const r = visible.get(t.section) ?? 0;
          if (r > bestRatio) {
            best = t;
            bestRatio = r;
          }
        }
        for (const t of targets) {
          if (t === best) t.a.setAttribute("aria-current", "true");
          else t.a.removeAttribute("aria-current");
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.01, 0.25, 0.5, 1] },
    );
    for (const t of targets) io.observe(t.section);
    return () => io.disconnect();
  }, []);
  return null;
}

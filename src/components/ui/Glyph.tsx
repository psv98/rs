const paths = {
  link: "M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  share: "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  screen: "M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5",
  check: "M4 12l5 5L20 6",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  close: "M5 5l14 14M19 5L5 19",
} as const;

export type GlyphName = keyof typeof paths;

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

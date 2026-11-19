/** Splits a label into two lines of similar length (by words). */
export function splitBalanced(text: string): [string, string] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return [text, ""];
  let best: [string, string] = [text, ""];
  let score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const s = Math.max(a.length, b.length);
    if (s < score) {
      score = s;
      best = [a, b];
    }
  }
  return best;
}

/**
 * War duration plaque. On narrow screens the two halves stack, and the plaque is only
 * as wide as the longer line, so it never looks half empty after a line break.
 */
export function WarPlaque({ label, className = "" }: { label: string; className?: string }) {
  const [a, b] = splitBalanced(label);
  return (
    <p className={`war-plaque ${className}`}>
      <span>{a}</span>
      {b && <span>{b}</span>}
    </p>
  );
}

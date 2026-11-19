import { visibleCategories, type PublicSnapshot } from "../data/schema";
import type { Category } from "../data/schema";

export type ExportFormat = "social" | "wide";

export interface SlideSpec {
  kind: "social" | "wide" | "og";
  index: number; // 1-based
  count: number;
  categories: Category[];
}

// Capacity per slide, tuned so every label stays readable at the target size.
// social: slide 1 is the radial overview (all categories in the diagram), then lists of 14.
export const CAPACITY = {
  social: { first: 0, next: 14 },
  wide: { first: 14, next: 14 },
} as const;

/** Splits the visible categories into as many slides as needed for readability. */
export function planSlides(data: Pick<PublicSnapshot["data"], "categories">, format: ExportFormat): SlideSpec[] {
  const cats = visibleCategories(data);
  const cap = CAPACITY[format];
  const chunks: Category[][] = [cats.slice(0, cap.first)];
  for (let i = cap.first; i < cats.length; i += cap.next) chunks.push(cats.slice(i, i + cap.next));
  if (chunks.length > 1 && chunks[0]!.length === 0 && format !== "social") chunks.shift();
  return chunks.map((c, i) => ({ kind: format, index: i + 1, count: chunks.length, categories: c }));
}

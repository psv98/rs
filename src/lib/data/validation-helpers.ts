export { suggestPeriodLabel } from "./dates";

/** Lexicographic compare is correct for YYYY-MM-DD. */
export function isoCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** How far ahead the editor may date (schedule) a publication. */
export const SCHEDULE_DAYS = 14;

/** YYYY-MM-DD plus n calendar days. */
export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

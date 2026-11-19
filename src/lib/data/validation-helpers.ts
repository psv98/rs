export { suggestPeriodLabel } from "./dates";

/** Lexicographic compare is correct for YYYY-MM-DD. */
export function isoCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

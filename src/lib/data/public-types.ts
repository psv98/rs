import type { PublicSnapshot } from "./schema";

export interface PublicState {
  /** Latest published snapshot (by as-of date), or null before the first publication. */
  current: PublicSnapshot | null;
  /** All published snapshots, newest first (one per period). */
  history: PublicSnapshot[];
}

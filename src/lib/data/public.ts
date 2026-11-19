import "server-only";
import { cache } from "react";
import { getDb } from "../db";
import { listPublished } from "./repository";
import { toPublicData, type PublicSnapshot } from "./schema";

import type { PublicState } from "./public-types";
export type { PublicState };

/**
 * The only entry point the public site and the public PNG export use.
 * Drafts and snapshots under review can never reach it.
 */
export const getPublicState = cache(async (): Promise<PublicState> => {
  const published = await listPublished(getDb());
  const history: PublicSnapshot[] = published
    .filter((r) => r.checksumValid)
    .map((r) => ({
      id: r.id,
      periodKey: r.periodKey,
      revision: r.revision,
      publishedAt: r.publishedAt,
      checksum: r.checksum,
      data: toPublicData(r.data),
    }));
  if (history.length !== published.length) {
    console.error("[integrity] published snapshot(s) with an invalid checksum were hidden from the public site");
  }
  return { current: history[0] ?? null, history };
});

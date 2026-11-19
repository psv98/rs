import "server-only";
import { cache } from "react";
import { getDb } from "../db";
import { listPublished } from "./repository";
import { toPublicData, type PublicSnapshot } from "./schema";
import { loadPublishedFile } from "./published-file";
import type { PublicState } from "./public-types";
export type { PublicState };

const isStaticBuild = () => process.env.STATIC_EXPORT === "1";

/**
 * The only entry point the public site and the public PNG export use.
 * Server mode: published snapshots from the database. Static mode (GitHub Pages):
 * the validated repository file. Drafts can never reach it.
 */
export const getPublicState = cache(async (): Promise<PublicState> => {
  if (isStaticBuild()) return loadPublishedFile();
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

/** Opt into per-request rendering in server mode; no-op for the static build. */
export async function dynamicInServerMode() {
  if (isStaticBuild()) return;
  const { connection } = await import("next/server");
  await connection();
}

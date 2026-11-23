import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { snapshotDataSchema, toPublicData, type PublicSnapshot } from "./schema";
import { validateSnapshot } from "./validation";
import { checksumOf } from "./checksum";
import { todayIso } from "./dates";
import type { PublicState } from "./public-types";
import type { DB } from "../db";
import { listPublished } from "./repository";

/**
 * Static publication (GitHub Pages): the published snapshots live in the repository,
 * in data/published/snapshots.json. Every entry is checked with the same rules as the
 * admin panel; entries that fail (e.g. editor confirmations not given) are left out of
 * the site and reported in the build log. A malformed file stops the build.
 */
export const PUBLISHED_FILE = "data/published/snapshots.json";
export const PUBLISHED_FORMAT = "imi-russias-crimes-published";

const fileSchema = z.object({
  format: z.literal(PUBLISHED_FORMAT),
  version: z.literal(1),
  snapshots: z
    .array(
      z.object({
        revision: z.number().int().min(1),
        publishedAt: z.string().nullable(),
        data: snapshotDataSchema,
      }),
    )
    .max(1000),
});
export type PublishedFile = z.infer<typeof fileSchema>;

export class PublishedFileError extends Error {}

export interface ParsedPublishedFile extends PublicState {
  /** Entries left out because they do not pass the publication rules (never shown publicly). */
  skipped: Array<{ asOfDate: string; problems: string[] }>;  /** Entries dated after today: held back, they go live on their date (daily rebuild). */
  scheduled: string[];
}

export function parsePublishedFile(json: unknown, today = todayIso()): ParsedPublishedFile {
  const parsed = fileSchema.safeParse(json);
  if (!parsed.success) {
    throw new PublishedFileError(`${PUBLISHED_FILE}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const items = [...parsed.data.snapshots].sort((a, b) => (a.data.asOfDate < b.data.asOfDate ? -1 : 1));
  const dates = items.map((s) => s.data.asOfDate);
  const dup = dates.find((d, i) => dates.indexOf(d) !== i);
  if (dup) throw new PublishedFileError(`${PUBLISHED_FILE}: кілька записів на дату ${dup}`);
  const accepted: typeof items = [];
  const skipped: ParsedPublishedFile["skipped"] = [];
  const scheduled = items.filter((s) => s.data.asOfDate > today).map((s) => s.data.asOfDate);
  for (const s of items.filter((x) => x.data.asOfDate <= today)) {
    const v = validateSnapshot(s.data, { today, previous: accepted[accepted.length - 1]?.data ?? null });
    const problems = v.issues.filter((x) => x.severity === "error").map((x) => x.message);
    if (problems.length) skipped.push({ asOfDate: s.data.asOfDate, problems });
    else accepted.push(s);
  }
  const history: PublicSnapshot[] = accepted
    .map((s, i) => ({
      id: i + 1,
      periodKey: s.data.asOfDate,
      revision: s.revision,
      publishedAt: s.publishedAt,
      checksum: checksumOf(s.data),
      data: toPublicData(s.data),
    }))
    .reverse();
  return { current: history[0] ?? null, history, skipped, scheduled };
}

let warned = false;
let warnedScheduled = false;
export function loadPublishedFile(file = PUBLISHED_FILE): ParsedPublishedFile {
  const full = path.join(/*turbopackIgnore: true*/ process.cwd(), file);
  if (!fs.existsSync(full)) return { current: null, history: [], skipped: [], scheduled: [] };
  const result = parsePublishedFile(JSON.parse(fs.readFileSync(full, "utf8")));
  if (result.skipped.length && !warned) {
    warned = true;
    for (const s of result.skipped) {
      console.warn(`::warning title=Знімок ${s.asOfDate} не опубліковано::${s.problems.join(" | ")}`);
    }
  }
  if (result.scheduled.length && !warnedScheduled) {
    warnedScheduled = true;
    console.log(`::notice title=Заплановано::${result.scheduled.join(", ")} — з'являться на сайті в ці дні`);
  }
  return result;
}

/** Current publications from the database, in the repository file format. */
export async function buildPublishedFile(db: DB): Promise<PublishedFile> {
  const published = await listPublished(db);
  return {
    format: PUBLISHED_FORMAT,
    version: 1,
    snapshots: published
      .filter((p) => p.checksumValid)
      .sort((a, b) => (a.periodKey < b.periodKey ? -1 : 1))
      .map((p) => ({ revision: p.revision, publishedAt: p.publishedAt, data: p.data })),
  };
}

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { createDb, setDbForTesting, type DB } from "@/lib/db";
import { migrateToLatest } from "@/lib/db/migrations";
import { snapshotDataSchema, type SnapshotData } from "@/lib/data/schema";

export const TMP = path.resolve("tests/.tmp");

export async function freshDb(): Promise<DB> {
  fs.mkdirSync(TMP, { recursive: true });
  process.env.BACKUP_DIR = path.join(TMP, `backups-${randomUUID()}`);
  const db = createDb(`file:${path.join(TMP, `${randomUUID()}.db`)}`);
  await migrateToLatest(db as unknown as Kysely<unknown>);
  setDbForTesting(db);
  return db;
}

export function seedOct(): SnapshotData {
  return snapshotDataSchema.parse(JSON.parse(fs.readFileSync("data/seed/2026-10-24.json", "utf8")));
}

export function seedSep(): SnapshotData {
  return snapshotDataSchema.parse(JSON.parse(fs.readFileSync("data/seed/2026-09-24.candidate.json", "utf8")));
}

/** October seed with the editorial confirmations filled in (as an editor would). */
export function confirmed(d: SnapshotData, explanation = "Пояснення редакції"): SnapshotData {
  return {
    ...d,
    verification: { ...d.verification, sourceChecked: true, sumMismatchConfirmed: true, sumMismatchExplanation: { uk: explanation, en: "Editors' explanation" } },
  };
}

export const actor = { username: "tester", ip: null };
export const TODAY = "2026-11-19";

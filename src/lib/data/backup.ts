import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { DB } from "../db";
import { config } from "../config";
import { snapshotDataSchema } from "./schema";
import { checksumOf } from "./checksum";
import { DomainError } from "./errors";

export const BACKUP_FORMAT = "imi-russias-crimes-backup";

const statusSchema = z.enum(["draft", "review", "published", "superseded", "withdrawn"]);
const backupSnapshotSchema = z.object({
  id: z.number().int(),
  periodKey: z.string(),
  revision: z.number().int(),
  status: statusSchema,
  checksum: z.string(),
  changeNote: z.string().max(500).default(""),
  basedOnId: z.number().int().nullable(),
  createdAt: z.string(),
  createdBy: z.string().max(64),
  updatedAt: z.string(),
  updatedBy: z.string().max(64),
  submittedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  publishedBy: z.string().max(64).nullable(),
  data: snapshotDataSchema,
});
export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportedAt: z.string(),
  snapshots: z.array(backupSnapshotSchema).max(5000),
});
export type Backup = z.infer<typeof backupSchema>;

/** Full structured export of all snapshots (drafts, publications and history). */
export async function exportBackup(db: DB): Promise<Backup> {
  const rows = await db.selectFrom("snapshot").selectAll().orderBy("id", "asc").execute();
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshots: rows.map((r) => ({
      id: r.id,
      periodKey: r.period_key,
      revision: r.revision,
      status: r.status,
      checksum: r.checksum,
      changeNote: r.change_note,
      basedOnId: r.based_on_id,
      createdAt: r.created_at,
      createdBy: r.created_by,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by,
      submittedAt: r.submitted_at,
      publishedAt: r.published_at,
      publishedBy: r.published_by,
      data: snapshotDataSchema.parse(JSON.parse(r.data)),
    })),
  };
}

export function parseBackup(json: unknown): Backup {
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new DomainError("backup-invalid", "Файл не є коректною резервною копією", 422, parsed.error.issues.slice(0, 20));
  for (const s of parsed.data.snapshots) {
    if (checksumOf(s.data) !== s.checksum) {
      throw new DomainError("backup-integrity", `Контрольна сума знімка #${s.id} у резервній копії не збігається`, 422);
    }
  }
  const published = parsed.data.snapshots.filter((s) => s.status === "published").map((s) => s.data.asOfDate);
  if (new Set(published).size !== published.length) throw new DomainError("backup-integrity", "У копії кілька опублікованих версій одного періоду", 422);
  return parsed.data;
}

/**
 * Full restore (CLI only): replaces all snapshots with the backup content, keeping
 * statuses, so the public site returns to the backed-up state.
 */
export async function restoreFullBackup(db: DB, backup: Backup, username: string) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("snapshot").execute();
    for (const s of backup.snapshots) {
      await trx
        .insertInto("snapshot")
        .values({
          period_key: s.data.asOfDate,
          revision: s.revision,
          status: s.status,
          data: JSON.stringify(s.data),
          checksum: s.checksum,
          change_note: s.changeNote,
          based_on_id: null,
          created_at: s.createdAt,
          created_by: s.createdBy,
          updated_at: s.updatedAt,
          updated_by: s.updatedBy,
          submitted_at: s.submittedAt,
          published_at: s.publishedAt,
          published_by: s.publishedBy,
        })
        .execute();
    }
    await trx
      .insertInto("audit_log")
      .values({
        at: new Date().toISOString(),
        username,
        action: "backup.restore-full",
        snapshot_id: null,
        details: JSON.stringify({ snapshots: backup.snapshots.length, exportedAt: backup.exportedAt }),
        ip: null,
      })
      .execute();
  });
}

const KEEP_FILES = 500;

/** Called after every change of what is published. Never throws (logged instead). */
export async function writeAutomaticBackup(db: DB, reason: string): Promise<string | null> {
  try {
    const dir = config.backupDir;
    await fs.mkdir(dir, { recursive: true });
    const data = await exportBackup(db);
    const stamp = data.exportedAt.replace(/[:.]/g, "-");
    const file = path.join(dir, `backup-${stamp}-${reason.replace(/[^a-z0-9-]/gi, "")}.json`);
    await fs.writeFile(file, JSON.stringify(data, null, 2), { mode: 0o600 });
    const files = (await fs.readdir(dir)).filter((f) => f.startsWith("backup-") && f.endsWith(".json")).sort();
    for (const old of files.slice(0, Math.max(0, files.length - KEEP_FILES))) await fs.unlink(path.join(dir, old));
    return file;
  } catch (e) {
    console.error("[backup] automatic backup failed:", (e as Error).message);
    return null;
  }
}

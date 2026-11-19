import { NextResponse } from "next/server";
import { adminRoute, readJson } from "@/lib/auth/guard";
import { exportBackup, parseBackup } from "@/lib/data/backup";
import { audit, insertSnapshot } from "@/lib/data/repository";

/** Download a full JSON export. */
export const GET = adminRoute(
  async ({ db, actor }) => {
    const data = await exportBackup(db);
    await audit(db, actor, "backup.download", null, { snapshots: data.snapshots.length });
    const name = `imi-russias-crimes-${data.exportedAt.slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { mutating: false },
);

/**
 * Import a JSON export. For safety every imported snapshot becomes a DRAFT — nothing is
 * published by an upload. (A full restore with statuses is a CLI operation.)
 */
export const POST = adminRoute(
  async ({ req, db, actor }) => {
    const backup = parseBackup(await readJson(req, 10 * 1024 * 1024));
    const ids: number[] = [];
    await db.transaction().execute(async (trx) => {
      for (const s of backup.snapshots) {
        const data = { ...s.data, verification: { ...s.data.verification, sourceChecked: false, sumMismatchConfirmed: false } };
        ids.push(await insertSnapshot(trx, data, actor, { status: "draft", changeNote: `Імпорт з копії ${backup.exportedAt.slice(0, 10)} (#${s.id}, ${s.status})` }));
      }
      await audit(trx, actor, "backup.import-drafts", null, { count: ids.length, exportedAt: backup.exportedAt });
    });
    return NextResponse.json({ imported: ids.length, ids });
  },
  { mutating: true },
);

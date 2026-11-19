import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import type { DB } from "@/lib/db";
import * as repo from "@/lib/data/repository";
import { getPublicState } from "@/lib/data/public";
import { exportBackup, parseBackup, restoreFullBackup } from "@/lib/data/backup";
import { freshDb, seedOct, seedSep, confirmed, actor } from "./helpers";

let db: DB;
beforeEach(async () => {
  db = await freshDb();
});

async function publishOct() {
  const id = await repo.insertSnapshot(db, confirmed(seedOct()), actor, { status: "review" });
  await repo.publish(db, actor, id, "2026-10-24");
  return id;
}

describe("publication workflow", () => {
  it("draft → review → published, public state only shows the publication", async () => {
    const id = await repo.insertSnapshot(db, seedOct(), actor, { status: "draft" });
    expect((await getPublicState()).current).toBeNull();
    await repo.submitForReview(db, actor, id);
    await expect(repo.publish(db, actor, id, "2026-10-24")).rejects.toMatchObject({ code: "validation" }); // not confirmed yet
    const rec = await repo.getSnapshot(db, id);
    await repo.updateVerification(db, actor, id, confirmed(seedOct()).verification, rec.updatedAt);
    await expect(repo.publish(db, actor, id, "wrong")).rejects.toMatchObject({ code: "confirm" });
    await repo.publish(db, actor, id, "2026-10-24");
    const pub = await getPublicState();
    expect(pub.current?.data.totalCrimes).toBe(989);
    expect(JSON.stringify(pub)).not.toContain("internalNote"); // internal note never public
  });

  it("never exposes drafts publicly", async () => {
    await publishOct();
    const draftId = await repo.createDraft(db, actor, null);
    const d = (await repo.getSnapshot(db, draftId)).data;
    await repo.updateDraft(db, actor, draftId, { ...d, totalCrimes: 1500 }, (await repo.getSnapshot(db, draftId)).updatedAt);
    expect((await getPublicState()).current?.data.totalCrimes).toBe(989);
  });

  it("published snapshots are immutable", async () => {
    const id = await publishOct();
    const rec = await repo.getSnapshot(db, id);
    await expect(repo.updateDraft(db, actor, id, rec.data, rec.updatedAt)).rejects.toMatchObject({ code: "not-editable" });
    await expect(repo.deleteDraft(db, actor, id)).rejects.toMatchObject({ code: "bad-state" });
  });

  it("an invalid save changes nothing (atomic)", async () => {
    const id = await repo.insertSnapshot(db, seedOct(), actor);
    const rec = await repo.getSnapshot(db, id);
    const broken = { ...rec.data, totalCrimes: -5, categories: [] };
    await expect(repo.updateDraft(db, actor, id, broken, rec.updatedAt)).rejects.toMatchObject({ code: "invalid" });
    const after = await repo.getSnapshot(db, id);
    expect(after.data.totalCrimes).toBe(989);
    expect(after.data.categories).toHaveLength(14);
  });

  it("rejects stale saves from another tab", async () => {
    const id = await repo.insertSnapshot(db, seedOct(), actor);
    const rec = await repo.getSnapshot(db, id);
    await repo.updateDraft(db, actor, id, { ...rec.data, totalCrimes: 990 }, rec.updatedAt);
    await expect(repo.updateDraft(db, actor, id, rec.data, rec.updatedAt)).rejects.toMatchObject({ code: "stale" });
  });

  it("corrections supersede, restore rolls back, withdraw takes down", async () => {
    const v1 = await publishOct();
    const v2 = await repo.createDraft(db, actor, v1, "correction");
    const d = await repo.getSnapshot(db, v2);
    await repo.updateDraft(db, actor, v2, confirmed({ ...d.data, totalCrimes: 988 }), d.updatedAt);
    await repo.submitForReview(db, actor, v2);
    await repo.publish(db, actor, v2, "2026-10-24");
    expect((await repo.getSnapshot(db, v1)).status).toBe("superseded");
    expect((await repo.getSnapshot(db, v2)).revision).toBe(2);
    expect((await getPublicState()).current?.data.totalCrimes).toBe(988);

    await repo.restore(db, actor, v1, "erroneous correction", "2026-10-24");
    expect((await getPublicState()).current?.data.totalCrimes).toBe(989);
    expect((await repo.getSnapshot(db, v2)).status).toBe("superseded");

    await repo.withdraw(db, actor, v1, "test withdrawal", "2026-10-24");
    expect((await getPublicState()).current).toBeNull();
    const log = await repo.listAudit(db);
    expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["publish", "restore", "withdraw"]));
  });

  it("the database refuses two publications of the same period", async () => {
    await publishOct();
    await expect(repo.insertSnapshot(db, confirmed(seedOct()), actor, { status: "published" })).rejects.toThrow();
  });

  it("current = latest as-of date, history keeps older periods", async () => {
    await publishOct();
    const sep = confirmed(seedSep());
    sep.sources.articleUk = "https://imi.org.ua/monitorings/example";
    sep.casualties.killedTotal = 137;
    const id = await repo.insertSnapshot(db, sep, actor, { status: "review" });
    await repo.publish(db, actor, id, "2026-09-24");
    const s = await getPublicState();
    expect(s.current?.periodKey).toBe("2026-10-24");
    expect(s.history.map((h) => h.periodKey)).toEqual(["2026-10-24", "2026-09-24"]);
  });
});

describe("integrity & backups", () => {
  it("hides a tampered publication and reports it", async () => {
    const id = await publishOct();
    await sql`UPDATE snapshot SET data = replace(data, '"totalCrimes":989', '"totalCrimes":9') WHERE id = ${id}`.execute(db);
    expect((await getPublicState()).current).toBeNull();
    const report = await repo.integrityReport(db);
    expect(report.find((r) => r.id === id)?.checksumOk).toBe(false);
  });

  it("round-trips through a JSON backup and restores the published state", async () => {
    await publishOct();
    const backup = parseBackup(JSON.parse(JSON.stringify(await exportBackup(db))));
    await db.deleteFrom("snapshot").execute();
    expect((await getPublicState()).current).toBeNull();
    await restoreFullBackup(db, backup, "test");
    expect((await getPublicState()).current?.data.totalCrimes).toBe(989);
  });

  it("rejects a backup whose data was modified", async () => {
    await publishOct();
    const backup = JSON.parse(JSON.stringify(await exportBackup(db)));
    backup.snapshots[0].data.totalCrimes = 1;
    expect(() => parseBackup(backup)).toThrow(/Контрольна сума/);
  });
});

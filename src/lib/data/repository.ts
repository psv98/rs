import "server-only";
import type { Transaction } from "kysely";
import type { DB } from "../db";
import type { Database, SnapshotStatus, SnapshotTable } from "../db/types";
import { snapshotDataSchema, type SnapshotData } from "./schema";
import { validateSnapshot, type ValidationResult } from "./validation";
import { checksumOf } from "./checksum";
import { DomainError } from "./errors";
import { todayIso } from "./dates";
import { writeAutomaticBackup } from "./backup";

export interface Actor {
  username: string;
  ip: string | null;
}

export interface SnapshotRecord {
  id: number;
  periodKey: string;
  revision: number;
  status: SnapshotStatus;
  data: SnapshotData;
  checksum: string;
  checksumValid: boolean;
  changeNote: string;
  basedOnId: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  submittedAt: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
}

type Row = Omit<SnapshotTable, "id"> & { id: number };
type Executor = DB | Transaction<Database>;

const now = () => new Date().toISOString();

function toRecord(row: Row): SnapshotRecord {
  const raw = JSON.parse(row.data);
  const parsed = snapshotDataSchema.safeParse(raw);
  if (!parsed.success) throw new DomainError("corrupt", `Знімок #${row.id} пошкоджений або має невідомий формат`, 500);
  return {
    id: row.id,
    periodKey: row.period_key,
    revision: row.revision,
    status: row.status,
    data: parsed.data,
    checksum: row.checksum,
    checksumValid: checksumOf(raw) === row.checksum,
    changeNote: row.change_note,
    basedOnId: row.based_on_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
  };
}

export async function audit(db: Executor, actor: Actor, action: string, snapshotId: number | null, details: Record<string, unknown> = {}) {
  await db
    .insertInto("audit_log")
    .values({ at: now(), username: actor.username, action, snapshot_id: snapshotId, details: JSON.stringify(details), ip: actor.ip })
    .execute();
}

export async function listSnapshots(db: Executor): Promise<SnapshotRecord[]> {
  const rows = (await db.selectFrom("snapshot").selectAll().orderBy("period_key", "desc").orderBy("revision", "desc").execute()) as Row[];
  return rows.map(toRecord);
}

export async function getSnapshot(db: Executor, id: number): Promise<SnapshotRecord> {
  const row = (await db.selectFrom("snapshot").selectAll().where("id", "=", id).executeTakeFirst()) as Row | undefined;
  if (!row) throw new DomainError("not-found", "Знімок не знайдено", 404);
  return toRecord(row);
}

export async function listPublished(db: Executor): Promise<SnapshotRecord[]> {
  const rows = (await db.selectFrom("snapshot").selectAll().where("status", "=", "published").orderBy("period_key", "desc").execute()) as Row[];
  return rows.map(toRecord);
}

/** The published snapshot that precedes `asOfDate` (used for trend checks). */
export async function previousPublished(db: Executor, asOfDate: string): Promise<SnapshotRecord | null> {
  const row = (await db
    .selectFrom("snapshot")
    .selectAll()
    .where("status", "=", "published")
    .where("period_key", "<", asOfDate)
    .orderBy("period_key", "desc")
    .executeTakeFirst()) as Row | undefined;
  return row ? toRecord(row) : null;
}

export async function validateRecord(db: Executor, data: unknown): Promise<ValidationResult> {
  const asOf = (data as { asOfDate?: string })?.asOfDate;
  const prev = typeof asOf === "string" ? await previousPublished(db, asOf) : null;
  return validateSnapshot(data, { previous: prev?.data ?? null, today: todayIso() });
}

async function nextRevision(db: Executor, periodKey: string): Promise<number> {
  const r = await db
    .selectFrom("snapshot")
    .select((eb) => eb.fn.max("revision").as("max"))
    .where("period_key", "=", periodKey)
    .executeTakeFirst();
  return Number(r?.max ?? 0) + 1;
}

function resetConfirmations(data: SnapshotData): SnapshotData {
  return {
    ...data,
    verification: { ...data.verification, sourceChecked: false, sumMismatchConfirmed: false },
  };
}

/** Insert a document as a new snapshot (used by drafts, seeding and JSON import). */
export async function insertSnapshot(
  db: Executor,
  data: SnapshotData,
  actor: Actor,
  opts: { status?: SnapshotStatus; basedOnId?: number | null; changeNote?: string; publishedAt?: string | null } = {},
): Promise<number> {
  const parsed = snapshotDataSchema.parse(data);
  const ts = now();
  const status = opts.status ?? "draft";
  const res = await db
    .insertInto("snapshot")
    .values({
      period_key: parsed.asOfDate,
      revision: await nextRevision(db, parsed.asOfDate),
      status,
      data: JSON.stringify(parsed),
      checksum: checksumOf(parsed),
      change_note: opts.changeNote ?? "",
      based_on_id: opts.basedOnId ?? null,
      created_at: ts,
      created_by: actor.username,
      updated_at: ts,
      updated_by: actor.username,
      submitted_at: status === "review" ? ts : null,
      published_at: status === "published" ? (opts.publishedAt ?? ts) : null,
      published_by: status === "published" ? actor.username : null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return Number(res.id);
}

/** New draft copied from another snapshot (the current publication by default). */
export async function createDraft(db: DB, actor: Actor, fromId: number | null, changeNote = ""): Promise<number> {
  return db.transaction().execute(async (trx) => {
    let source: SnapshotRecord | null = null;
    if (fromId !== null) source = await getSnapshot(trx, fromId);
    else source = (await listPublished(trx))[0] ?? null;
    if (!source) throw new DomainError("no-source", "Немає знімка, з якого можна скопіювати дані", 409);
    const id = await insertSnapshot(trx, resetConfirmations(source.data), actor, { basedOnId: source.id, changeNote });
    await audit(trx, actor, "draft.create", id, { basedOn: source.id });
    return id;
  });
}

/**
 * Save a draft. The whole document is validated and written atomically: if anything
 * is invalid, nothing is written, so one bad field can never blank the main figures.
 * `expectedUpdatedAt` protects against overwriting a newer save from another tab.
 */
export async function updateDraft(db: DB, actor: Actor, id: number, input: unknown, expectedUpdatedAt: string, changeNote?: string) {
  return db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "draft") throw new DomainError("not-editable", "Редагувати можна лише чернетку", 409);
    if (cur.updatedAt !== expectedUpdatedAt)
      throw new DomainError("stale", "Знімок змінено в іншому вікні. Оновіть сторінку, щоб не втратити зміни.", 409);
    const parsed = snapshotDataSchema.safeParse(input);
    if (!parsed.success) throw new DomainError("invalid", "Дані не пройшли перевірку", 422, parsed.error.issues);
    const data = parsed.data;
    const periodChanged = data.asOfDate !== cur.periodKey;
    const ts = now();
    await trx
      .updateTable("snapshot")
      .set({
        data: JSON.stringify(data),
        checksum: checksumOf(data),
        period_key: data.asOfDate,
        revision: periodChanged ? await nextRevision(trx, data.asOfDate) : cur.revision,
        updated_at: ts,
        updated_by: actor.username,
        ...(changeNote !== undefined ? { change_note: changeNote.slice(0, 500) } : {}),
      })
      .where("id", "=", id)
      .where("status", "=", "draft")
      .execute();
    await audit(trx, actor, "draft.save", id, { totalCrimes: data.totalCrimes, asOfDate: data.asOfDate });
    return getSnapshot(trx, id);
  });
}

/** Confirmation flags may be changed in draft AND review (they are the review step). */
export async function updateVerification(
  db: DB,
  actor: Actor,
  id: number,
  verification: SnapshotData["verification"],
  expectedUpdatedAt: string,
) {
  return db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "draft" && cur.status !== "review") throw new DomainError("not-editable", "Знімок уже опубліковано", 409);
    if (cur.updatedAt !== expectedUpdatedAt) throw new DomainError("stale", "Знімок змінено в іншому вікні. Оновіть сторінку.", 409);
    const data = snapshotDataSchema.parse({ ...cur.data, verification });
    await trx
      .updateTable("snapshot")
      .set({ data: JSON.stringify(data), checksum: checksumOf(data), updated_at: now(), updated_by: actor.username })
      .where("id", "=", id)
      .execute();
    await audit(trx, actor, "verification.update", id, {
      sourceChecked: data.verification.sourceChecked,
      sumMismatchConfirmed: data.verification.sumMismatchConfirmed,
    });
    return getSnapshot(trx, id);
  });
}

export async function submitForReview(db: DB, actor: Actor, id: number) {
  return db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "draft") throw new DomainError("bad-state", "На перевірку можна передати лише чернетку", 409);
    const v = await validateRecord(trx, cur.data);
    if (!v.canSubmit) throw new DomainError("validation", "Виправте помилки в даних перед передачею на перевірку", 422, v.issues);
    await trx.updateTable("snapshot").set({ status: "review", submitted_at: now(), updated_at: now(), updated_by: actor.username }).where("id", "=", id).execute();
    await audit(trx, actor, "review.submit", id);
  });
}

export async function returnToDraft(db: DB, actor: Actor, id: number) {
  return db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "review") throw new DomainError("bad-state", "Повернути можна лише знімок на перевірці", 409);
    await trx.updateTable("snapshot").set({ status: "draft", updated_at: now(), updated_by: actor.username }).where("id", "=", id).execute();
    await audit(trx, actor, "review.return", id);
  });
}

async function setPublished(trx: Transaction<Database>, actor: Actor, rec: SnapshotRecord) {
  // Supersede the current publication for the same period (kept in history).
  const current = await trx
    .selectFrom("snapshot")
    .select(["id"])
    .where("status", "=", "published")
    .where("period_key", "=", rec.periodKey)
    .executeTakeFirst();
  if (current && current.id !== rec.id) {
    await trx.updateTable("snapshot").set({ status: "superseded" }).where("id", "=", current.id).execute();
  }
  await trx
    .updateTable("snapshot")
    .set({ status: "published", published_at: now(), published_by: actor.username })
    .where("id", "=", rec.id)
    .execute();
  return current?.id ?? null;
}

/** Review → Published. Only fully validated, confirmed snapshots are published. */
export async function publish(db: DB, actor: Actor, id: number, confirmation: string) {
  await db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "review") throw new DomainError("bad-state", "Опублікувати можна лише знімок, що пройшов етап перевірки", 409);
    if (confirmation !== cur.periodKey) throw new DomainError("confirm", "Для публікації введіть дату актуальності знімка", 400);
    if (!cur.checksumValid) throw new DomainError("integrity", "Контрольна сума знімка не збігається — публікацію зупинено", 409);
    const v = await validateRecord(trx, cur.data);
    if (!v.canPublish) throw new DomainError("validation", "Знімок не готовий до публікації", 422, v.issues);
    const superseded = await setPublished(trx, actor, cur);
    await audit(trx, actor, "publish", id, { periodKey: cur.periodKey, revision: cur.revision, superseded, checksum: cur.checksum });
  });
  await writeAutomaticBackup(db, `publish-${id}`);
}

/** Take a publication down (e.g. an erroneous or malicious publication). */
export async function withdraw(db: DB, actor: Actor, id: number, reason: string, confirmation: string) {
  await db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "published") throw new DomainError("bad-state", "Зняти з публікації можна лише опублікований знімок", 409);
    if (confirmation !== cur.periodKey) throw new DomainError("confirm", "Введіть дату актуальності знімка для підтвердження", 400);
    if (reason.trim().length < 5) throw new DomainError("reason", "Вкажіть причину (щонайменше 5 символів)", 400);
    await trx.updateTable("snapshot").set({ status: "withdrawn", updated_at: now(), updated_by: actor.username }).where("id", "=", id).execute();
    await audit(trx, actor, "withdraw", id, { reason: reason.slice(0, 500) });
  });
  await writeAutomaticBackup(db, `withdraw-${id}`);
}

/** Re-publish an earlier (superseded or withdrawn) revision — the rollback operation. */
export async function restore(db: DB, actor: Actor, id: number, reason: string, confirmation: string) {
  await db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "superseded" && cur.status !== "withdrawn")
      throw new DomainError("bad-state", "Відновити можна лише попередню опубліковану версію", 409);
    if (!cur.publishedAt) throw new DomainError("bad-state", "Цю версію ніколи не публікували", 409);
    if (confirmation !== cur.periodKey) throw new DomainError("confirm", "Введіть дату актуальності знімка для підтвердження", 400);
    if (!cur.checksumValid) throw new DomainError("integrity", "Контрольна сума версії не збігається — відновлення зупинено", 409);
    if (reason.trim().length < 5) throw new DomainError("reason", "Вкажіть причину (щонайменше 5 символів)", 400);
    const superseded = await setPublished(trx, actor, cur);
    await audit(trx, actor, "restore", id, { reason: reason.slice(0, 500), superseded });
  });
  await writeAutomaticBackup(db, `restore-${id}`);
}

/** Only never-published working copies can be deleted. */
export async function deleteDraft(db: DB, actor: Actor, id: number) {
  await db.transaction().execute(async (trx) => {
    const cur = await getSnapshot(trx, id);
    if (cur.status !== "draft" && cur.status !== "review") throw new DomainError("bad-state", "Видалити можна лише неопубліковану чернетку", 409);
    await trx.deleteFrom("snapshot").where("id", "=", id).where("status", "in", ["draft", "review"]).execute();
    await audit(trx, actor, "draft.delete", id, { periodKey: cur.periodKey, revision: cur.revision });
  });
}

export async function integrityReport(db: DB) {
  const rows = (await db.selectFrom("snapshot").selectAll().execute()) as Row[];
  return rows.map((r) => {
    let ok = false;
    let parseOk = false;
    try {
      const raw = JSON.parse(r.data);
      ok = checksumOf(raw) === r.checksum;
      parseOk = snapshotDataSchema.safeParse(raw).success;
    } catch {
      /* corrupt JSON */
    }
    return { id: r.id, periodKey: r.period_key, revision: r.revision, status: r.status, checksumOk: ok, schemaOk: parseOk };
  });
}

export async function listAudit(db: DB, limit = 200) {
  return db.selectFrom("audit_log").selectAll().orderBy("id", "desc").limit(limit).execute();
}

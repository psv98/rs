import "server-only";
import type { DB } from "../db";

/**
 * Brute-force protection, persisted in the database (survives restarts, works with
 * several app instances on PostgreSQL).
 *  - per username: 5 failures → lock 15 min, doubling on each further lock (max 24 h)
 *  - per IP:      20 failures in 15 min → lock 30 min
 */
const RULES = {
  user: { max: 5, windowMin: 15, baseLockMin: 15, maxLockMin: 24 * 60 },
  ip: { max: 20, windowMin: 15, baseLockMin: 30, maxLockMin: 24 * 60 },
} as const;

type Kind = keyof typeof RULES;
const key = (kind: Kind, v: string) => `${kind}:${v.toLowerCase().slice(0, 140)}`;

export async function isLocked(db: DB, kind: Kind, value: string): Promise<{ locked: boolean; until?: string }> {
  const row = await db.selectFrom("login_throttle").selectAll().where("key", "=", key(kind, value)).executeTakeFirst();
  if (row?.locked_until && Date.parse(row.locked_until) > Date.now()) return { locked: true, until: row.locked_until };
  return { locked: false };
}

export async function registerFailure(db: DB, kind: Kind, value: string) {
  const rule = RULES[kind];
  const k = key(kind, value);
  const now = Date.now();
  const row = await db.selectFrom("login_throttle").selectAll().where("key", "=", k).executeTakeFirst();
  let failures = 1;
  let windowStart = new Date(now).toISOString();
  let lockedUntil: string | null = null;
  if (row) {
    const inWindow = now - Date.parse(row.window_start) < rule.windowMin * 60_000 || (row.locked_until && Date.parse(row.locked_until) > now - 60 * 60_000);
    failures = inWindow ? row.failures + 1 : 1;
    windowStart = inWindow ? row.window_start : windowStart;
  }
  if (failures >= rule.max) {
    const extraLocks = Math.floor((failures - rule.max) / rule.max);
    const mins = Math.min(rule.baseLockMin * 2 ** extraLocks, rule.maxLockMin);
    lockedUntil = new Date(now + mins * 60_000).toISOString();
  }
  if (row) {
    await db.updateTable("login_throttle").set({ failures, window_start: windowStart, locked_until: lockedUntil }).where("key", "=", k).execute();
  } else {
    await db.insertInto("login_throttle").values({ key: k, failures, window_start: windowStart, locked_until: lockedUntil }).execute();
  }
}

export async function clearFailures(db: DB, kind: Kind, value: string) {
  await db.deleteFrom("login_throttle").where("key", "=", key(kind, value)).execute();
}

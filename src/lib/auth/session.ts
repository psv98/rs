import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { DB } from "../db";
import { config } from "../config";

export const SESSION_COOKIE_SECURE = "__Host-imi_admin";
export const SESSION_COOKIE_DEV = "imi_admin";

export function sessionCookieName() {
  return config.isProduction ? SESSION_COOKIE_SECURE : SESSION_COOKIE_DEV;
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    // __Host- prefix requires Secure + Path=/ and no Domain: the cookie cannot be
    // set or overwritten by sub-domains.
    secure: config.isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export interface SessionUser {
  sessionId: string;
  userId: number;
  username: string;
  csrfToken: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const nowIso = () => new Date().toISOString();
const addMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

export async function createSession(db: DB, userId: number, ip: string | null, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(32).toString("base64url");
  const ts = nowIso();
  await db
    .insertInto("session")
    .values({
      id: sha256(token),
      user_id: userId,
      csrf_token: csrf,
      created_at: ts,
      last_seen_at: ts,
      expires_at: addMinutes(config.sessionAbsoluteMinutes),
      ip,
      user_agent: userAgent?.slice(0, 256) ?? null,
    })
    .execute();
  // Opportunistic cleanup of expired sessions.
  await db.deleteFrom("session").where("expires_at", "<", ts).execute();
  return { token, csrf, maxAge: config.sessionAbsoluteMinutes * 60 };
}

/** Resolves a raw cookie token to a live session (absolute + idle timeout enforced). */
export async function getSessionByToken(db: DB, token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const row = await db
    .selectFrom("session")
    .innerJoin("admin_user", "admin_user.id", "session.user_id")
    .select([
      "session.id as id",
      "session.user_id as user_id",
      "session.csrf_token as csrf_token",
      "session.last_seen_at as last_seen_at",
      "session.expires_at as expires_at",
      "admin_user.username as username",
      "admin_user.disabled as disabled",
    ])
    .where("session.id", "=", id)
    .executeTakeFirst();
  if (!row || row.disabled) return null;
  const now = Date.now();
  const idleLimit = Date.parse(row.last_seen_at) + config.sessionIdleMinutes * 60_000;
  if (Date.parse(row.expires_at) < now || idleLimit < now) {
    await db.deleteFrom("session").where("id", "=", id).execute();
    return null;
  }
  // Touch at most once a minute to limit writes.
  if (now - Date.parse(row.last_seen_at) > 60_000) {
    await db.updateTable("session").set({ last_seen_at: nowIso() }).where("id", "=", id).execute();
  }
  return { sessionId: row.id, userId: row.user_id, username: row.username, csrfToken: row.csrf_token };
}

export async function destroySession(db: DB, token: string | undefined | null) {
  if (!token) return;
  await db.deleteFrom("session").where("id", "=", sha256(token)).execute();
}

export async function destroyAllSessionsForUser(db: DB, userId: number) {
  await db.deleteFrom("session").where("user_id", "=", userId).execute();
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

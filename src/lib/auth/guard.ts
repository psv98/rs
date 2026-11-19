import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getDb, type DB } from "../db";
import { getSessionByToken, safeEqual, sessionCookieName, type SessionUser } from "./session";
import { clientIp, isSameOrigin } from "../security/request";
import { DomainError } from "../data/errors";
import type { Actor } from "../data/repository";

export function jsonError(status: number, error: string, message: string, details?: unknown) {
  return NextResponse.json({ error, message, ...(details ? { details } : {}) }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Maps thrown errors to safe responses; internal errors never leak details. */
export function handleError(e: unknown) {
  if (e instanceof DomainError) return jsonError(e.status, e.code, e.message, e.details);
  const ref = randomUUID().slice(0, 8);
  console.error(`[api:${ref}]`, e);
  return jsonError(500, "internal", `Внутрішня помилка сервера (код ${ref}). Деталі записано в журнал сервера.`);
}

export interface AdminContext<P> {
  req: NextRequest;
  session: SessionUser;
  db: DB;
  actor: Actor;
  params: P;
}

/**
 * Wraps every admin API route. Authorization is checked on the server for EVERY
 * request; state-changing requests additionally need same-origin, a JSON body and
 * the per-session CSRF token.
 */
export function adminRoute<P = Record<string, string>>(
  handler: (ctx: AdminContext<P>) => Promise<Response>,
  opts: { mutating: boolean },
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const db = getDb();
      const session = await getSessionByToken(db, req.cookies.get(sessionCookieName())?.value);
      if (!session) return jsonError(401, "unauthorized", "Потрібна авторизація");
      if (opts.mutating) {
        if (!isSameOrigin(req.headers)) return jsonError(403, "origin", "Запит з іншого джерела відхилено");
        if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
          return jsonError(415, "content-type", "Очікується application/json");
        const csrf = req.headers.get("x-csrf-token") ?? "";
        if (!csrf || !safeEqual(csrf, session.csrfToken)) return jsonError(403, "csrf", "Недійсний CSRF-токен. Оновіть сторінку.");
      }
      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;
      return await handler({ req, session, db, actor: { username: session.username, ip: clientIp(req.headers) }, params });
    } catch (e) {
      return handleError(e);
    }
  };
}

/** Reads a JSON body with a size cap. */
export async function readJson(req: NextRequest, maxBytes = 512 * 1024): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new DomainError("too-large", "Запит завеликий", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError("bad-json", "Некоректний JSON", 400);
  }
}

/** For admin server components: returns the session or redirects to the login page. */
export async function requireAdminPage(): Promise<SessionUser> {
  const store = await cookies();
  const session = await getSessionByToken(getDb(), store.get(sessionCookieName())?.value);
  if (!session) redirect("/admin/login");
  return session;
}

export async function optionalAdminSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionByToken(getDb(), store.get(sessionCookieName())?.value);
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { cookieOptions, createSession, sessionCookieName } from "@/lib/auth/session";
import { clearFailures, isLocked, registerFailure } from "@/lib/auth/throttle";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { handleError, jsonError, readJson } from "@/lib/auth/guard";
import { audit } from "@/lib/data/repository";

const bodySchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

const GENERIC = "Невірне ім'я користувача або пароль";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req.headers)) return jsonError(403, "origin", "Запит з іншого джерела відхилено");
    if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return jsonError(415, "content-type", "Очікується application/json");
    const parsed = bodySchema.safeParse(await readJson(req, 4096));
    if (!parsed.success) return jsonError(400, "invalid", GENERIC);
    const { username, password } = parsed.data;
    const db = getDb();
    const ip = clientIp(req.headers);

    const userLock = await isLocked(db, "user", username);
    const ipLock = ip ? await isLocked(db, "ip", ip) : { locked: false };
    if (userLock.locked || ipLock.locked) {
      await audit(db, { username: username.slice(0, 64), ip }, "auth.locked", null);
      return jsonError(429, "locked", "Забагато невдалих спроб. Вхід тимчасово заблоковано, спробуйте пізніше.");
    }

    const user = await db.selectFrom("admin_user").selectAll().where("username", "=", username).executeTakeFirst();
    // Always run one Argon2 verification so response time does not reveal valid usernames.
    const ok = user && !user.disabled ? await verifyPassword(user.password_hash, password) : (await verifyPassword(await getDummyHash(), password), false);

    if (!ok || !user) {
      await registerFailure(db, "user", username);
      if (ip) await registerFailure(db, "ip", ip);
      await audit(db, { username: username.slice(0, 64), ip }, "auth.fail", null);
      return jsonError(401, "invalid", GENERIC);
    }

    await clearFailures(db, "user", username);
    if (ip) await clearFailures(db, "ip", ip);
    const { token, maxAge } = await createSession(db, user.id, ip, req.headers.get("user-agent"));
    await db.updateTable("admin_user").set({ last_login_at: new Date().toISOString() }).where("id", "=", user.id).execute();
    await audit(db, { username: user.username, ip }, "auth.login", null);

    const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(sessionCookieName(), token, cookieOptions(maxAge));
    return res;
  } catch (e) {
    return handleError(e);
  }
}

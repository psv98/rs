import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/auth/guard";
import { destroySession, sessionCookieName, cookieOptions } from "@/lib/auth/session";
import { audit } from "@/lib/data/repository";

export const POST = adminRoute(
  async ({ req, db, actor }) => {
    await destroySession(db, req.cookies.get(sessionCookieName())?.value);
    await audit(db, actor, "auth.logout", null);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), "", { ...cookieOptions(0), maxAge: 0 });
    return res;
  },
  { mutating: true },
);

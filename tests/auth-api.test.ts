import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { DB } from "@/lib/db";
import { hashPassword, verifyPassword, passwordProblems } from "@/lib/auth/password";
import { createSession, getSessionByToken } from "@/lib/auth/session";
import { insertSnapshot } from "@/lib/data/repository";
import * as login from "@/app/api/admin/login/route.server";
import * as snapshots from "@/app/api/admin/snapshots/route.server";
import * as snapshot from "@/app/api/admin/snapshots/[id]/route.server";
import * as action from "@/app/api/admin/snapshots/[id]/action/route.server";
import * as adminExport from "@/app/api/admin/export/route.server";
import * as backup from "@/app/api/admin/backup/route.server";
import { freshDb, seedOct, actor } from "./helpers";

const ORIGIN = "http://localhost:3000";
const PASS = "a long enough test passphrase";
let db: DB;

function req(path: string, init: { method?: string; body?: unknown; cookie?: string; csrf?: string; origin?: string | null; contentType?: string } = {}) {
  const headers = new Headers({ host: "localhost:3000" });
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  if (init.body !== undefined) headers.set("content-type", init.contentType ?? "application/json");
  if (init.cookie) headers.set("cookie", `imi_admin=${init.cookie}`);
  if (init.csrf) headers.set("x-csrf-token", init.csrf);
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const params = (p: Record<string, string> = {}) => ({ params: Promise.resolve(p as any) });

beforeEach(async () => {
  db = await freshDb();
  await db.insertInto("admin_user").values({ username: "editor", password_hash: await hashPassword(PASS), created_at: new Date().toISOString(), last_login_at: null, disabled: 0 }).execute();
});

async function session() {
  const user = await db.selectFrom("admin_user").select("id").executeTakeFirstOrThrow();
  const s = await createSession(db, user.id, null, "test");
  return { token: s.token, csrf: s.csrf };
}

describe("passwords", () => {
  it("uses Argon2id and verifies", async () => {
    const h = await hashPassword(PASS);
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(h).not.toContain(PASS);
    expect(await verifyPassword(h, PASS)).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });
  it("enforces a length-first policy", () => {
    expect(passwordProblems("short", "editor").length).toBeGreaterThan(0);
    expect(passwordProblems("editor-is-my-password!", "editor").length).toBeGreaterThan(0);
    expect(passwordProblems(PASS, "editor")).toEqual([]);
  });
});

describe("login", () => {
  it("logs in and sets a hardened cookie", async () => {
    const res = await login.POST(req("/api/admin/login", { method: "POST", body: { username: "editor", password: PASS } }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\//);
  });
  it("gives the same generic error for unknown user and wrong password", async () => {
    const a = await login.POST(req("/api/admin/login", { method: "POST", body: { username: "nobody", password: PASS } }));
    const b = await login.POST(req("/api/admin/login", { method: "POST", body: { username: "editor", password: "wrong password!!" } }));
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect((await a.json()).message).toBe((await b.json()).message);
  });
  it("locks the account after repeated failures (brute force)", async () => {
    for (let i = 0; i < 5; i++) await login.POST(req("/api/admin/login", { method: "POST", body: { username: "editor", password: `wrong-${i}-xxxxxx` } }));
    const res = await login.POST(req("/api/admin/login", { method: "POST", body: { username: "editor", password: PASS } }));
    expect(res.status).toBe(429);
  });
  it("rejects cross-origin login attempts", async () => {
    const res = await login.POST(req("/api/admin/login", { method: "POST", body: { username: "editor", password: PASS }, origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("sessions", () => {
  it("stores only a hash of the token", async () => {
    const s = await session();
    const rows = await db.selectFrom("session").select("id").execute();
    expect(rows[0]!.id).not.toBe(s.token);
    expect((await getSessionByToken(db, s.token))?.username).toBe("editor");
    expect(await getSessionByToken(db, "forged-token")).toBeNull();
  });
  it("expires idle sessions", async () => {
    const s = await session();
    await db.updateTable("session").set({ last_seen_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }).execute();
    expect(await getSessionByToken(db, s.token)).toBeNull();
  });
});

describe("admin API authorization", () => {
  it("rejects unauthenticated reads and writes", async () => {
    expect((await snapshots.GET(req("/api/admin/snapshots"), params())).status).toBe(401);
    expect((await snapshots.POST(req("/api/admin/snapshots", { method: "POST", body: {} }), params())).status).toBe(401);
    expect((await adminExport.GET(req("/api/admin/export?id=1&format=social"), params())).status).toBe(401);
    expect((await backup.GET(req("/api/admin/backup"), params())).status).toBe(401);
  });

  it("rejects writes without CSRF token, from another origin, or non-JSON", async () => {
    const s = await session();
    const id = await insertSnapshot(db, seedOct(), actor);
    const body = { action: "submit" };
    const noCsrf = await action.POST(req(`/api/admin/snapshots/${id}/action`, { method: "POST", body, cookie: s.token }), params({ id: String(id) }));
    expect(noCsrf.status).toBe(403);
    const badCsrf = await action.POST(req(`/api/admin/snapshots/${id}/action`, { method: "POST", body, cookie: s.token, csrf: "x".repeat(43) }), params({ id: String(id) }));
    expect(badCsrf.status).toBe(403);
    const evil = await action.POST(req(`/api/admin/snapshots/${id}/action`, { method: "POST", body, cookie: s.token, csrf: s.csrf, origin: "https://evil.example" }), params({ id: String(id) }));
    expect(evil.status).toBe(403);
    const form = await action.POST(req(`/api/admin/snapshots/${id}/action`, { method: "POST", body: "action=submit", contentType: "application/x-www-form-urlencoded", cookie: s.token, csrf: s.csrf }), params({ id: String(id) }));
    expect(form.status).toBe(415);
    const ok = await action.POST(req(`/api/admin/snapshots/${id}/action`, { method: "POST", body, cookie: s.token, csrf: s.csrf }), params({ id: String(id) }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).snapshot.status).toBe("review");
  });

  it("validates payloads and never leaks internals", async () => {
    const s = await session();
    const id = await insertSnapshot(db, seedOct(), actor);
    const rec = (await (await snapshot.GET(req(`/api/admin/snapshots/${id}`, { cookie: s.token }), params({ id: String(id) }))).json()).snapshot;
    const bad = { ...rec.data, categories: [{ ...rec.data.categories[0], name: { uk: "<script>x</script>", en: "x" } }] };
    const res = await snapshot.PUT(req(`/api/admin/snapshots/${id}`, { method: "PUT", body: { data: bad, expectedUpdatedAt: rec.updatedAt }, cookie: s.token, csrf: s.csrf }), params({ id: String(id) }));
    expect(res.status).toBe(422);
    const notFound = await snapshot.GET(req(`/api/admin/snapshots/999`, { cookie: s.token }), params({ id: "999" }));
    expect(notFound.status).toBe(404);
    const junk = await snapshot.PUT(req(`/api/admin/snapshots/${id}`, { method: "PUT", body: "{not json", cookie: s.token, csrf: s.csrf }), params({ id: String(id) }));
    expect(junk.status).toBe(400);
  });
});

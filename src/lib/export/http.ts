import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "../security/request";
import { takeToken, withRenderSlot } from "../security/rate-limit";
import type { Locale } from "../data/schema";

export function parseLocale(v: string | null): Locale | null {
  return v === "uk" || v === "en" ? v : null;
}

export function limited(req: NextRequest, bucket: string, capacity = 30, perMinute = 30): NextResponse | null {
  const key = `${bucket}:${clientIp(req.headers) ?? "global"}`;
  // Without a trusted client IP all clients share one bucket, so allow more.
  const ok = clientIp(req.headers) ? takeToken(key, capacity, perMinute) : takeToken(key, capacity * 10, perMinute * 10);
  if (ok) return null;
  return NextResponse.json({ error: "rate-limited", message: "Забагато запитів. Спробуйте за хвилину." }, { status: 429, headers: { "Retry-After": "60" } });
}

export async function rendered(fn: () => Promise<Uint8Array | Buffer>, headers: Record<string, string>, etag?: string, req?: NextRequest) {
  if (etag && req?.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  try {
    const body = await withRenderSlot(fn);
    return new NextResponse(new Uint8Array(body), { headers: { ...headers, ...(etag ? { ETag: etag } : {}) } });
  } catch (e) {
    if ((e as Error).message === "busy") return NextResponse.json({ error: "busy", message: "Сервер зайнятий, спробуйте ще раз." }, { status: 503, headers: { "Retry-After": "5" } });
    throw e;
  }
}

import "server-only";
import { config } from "../config";

/** Client IP for throttling/audit. Forwarded headers are trusted only behind a known proxy. */
export function clientIp(headers: Headers): string | null {
  if (!config.trustProxy) return null;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim().slice(0, 64) || null;
  return headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

/**
 * Same-origin check for state-changing requests: the Origin (or Referer) host must
 * match the Host the request was sent to. Combined with SameSite=Strict cookies,
 * the per-session CSRF token and the JSON-only content type, this blocks CSRF.
 */
export function isSameOrigin(headers: Headers): boolean {
  const host = headers.get("x-forwarded-host") && config.trustProxy ? headers.get("x-forwarded-host") : headers.get("host");
  if (!host) return false;
  const origin = headers.get("origin");
  const source = origin ?? headers.get("referer");
  if (!source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

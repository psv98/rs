import "server-only";

/**
 * Small in-memory token bucket for public endpoints (PNG export, OG images).
 * Per-instance only; put a CDN / reverse-proxy limit in front in production as well.
 */
interface Bucket {
  tokens: number;
  updated: number;
}
const buckets = new Map<string, Bucket>();

export function takeToken(key: string, capacity: number, refillPerMinute: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / 60_000) * refillPerMinute);
  b.updated = now;
  const ok = b.tokens >= 1;
  if (ok) b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (now - v.updated > 10 * 60_000) buckets.delete(k);
  }
  return ok;
}

/** Limits simultaneous CPU-heavy renders. */
let running = 0;
const queue: Array<() => void> = [];
export async function withRenderSlot<T>(fn: () => Promise<T>, max = 2, maxQueue = 20): Promise<T> {
  if (running >= max) {
    if (queue.length >= maxQueue) throw new Error("busy");
    await new Promise<void>((r) => queue.push(r));
  }
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

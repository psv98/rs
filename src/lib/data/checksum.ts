import "server-only";
import { createHash } from "node:crypto";

/** Deterministic JSON (sorted keys) so the checksum does not depend on key order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

export function checksumOf(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

import "server-only";
import path from "node:path";

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  get siteUrl(): string {
    return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  },
  get databaseUrl(): string {
    return process.env.DATABASE_URL || "file:./var/imi.db";
  },
  get backupDir(): string {
    return path.resolve(/*turbopackIgnore: true*/ process.env.BACKUP_DIR || "./backups");
  },
  get trustProxy(): boolean {
    return process.env.TRUST_PROXY === "1";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get sessionIdleMinutes(): number {
    return int("SESSION_IDLE_MINUTES", 120);
  },
  get sessionAbsoluteMinutes(): number {
    return int("SESSION_ABSOLUTE_MINUTES", 720);
  },
};

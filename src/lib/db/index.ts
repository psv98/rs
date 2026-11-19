import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Kysely, PostgresDialect, SqliteDialect } from "kysely";
import type { Database } from "./types";
import { config } from "../config";

export type DB = Kysely<Database>;

/** Creates a Kysely instance for a DATABASE_URL (file:… → SQLite, postgres://… → PostgreSQL). */
export function createDb(url: string): DB {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    return new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: url, max: 10 }) }),
    });
  }
  const file = url.replace(/^file:/, "");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require("better-sqlite3") as typeof import("better-sqlite3");
  const sqlite = new SQLite(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  return new Kysely<Database>({ dialect: new SqliteDialect({ database: sqlite }) });
}

const globalForDb = globalThis as unknown as { __imiDb?: DB };

/** Process-wide database handle (reused across hot reloads in development). */
export function getDb(): DB {
  if (!globalForDb.__imiDb) globalForDb.__imiDb = createDb(config.databaseUrl);
  return globalForDb.__imiDb;
}

/** Test hook: replace the process-wide handle. */
export function setDbForTesting(db: DB | undefined) {
  globalForDb.__imiDb = db;
}

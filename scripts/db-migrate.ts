import { loadEnv } from "./lib/env";
loadEnv();
import { createDb } from "../src/lib/db";
import { migrateToLatest } from "../src/lib/db/migrations";
import type { Kysely } from "kysely";

async function main() {
  const db = createDb(process.env.DATABASE_URL || "file:./var/imi.db");
  const results = await migrateToLatest(db as unknown as Kysely<unknown>);
  for (const r of results) console.log(`${r.status === "Success" ? "✓" : "✗"} ${r.migrationName}`);
  if (results.length === 0) console.log("Database schema is up to date.");
  await db.destroy();
}
main().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});

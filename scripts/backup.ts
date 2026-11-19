/**
 * npm run db:backup                 → JSON export of all snapshots into BACKUP_DIR
 * npm run db:backup -- --sqlite     → additionally a consistent copy of the SQLite file
 */
import { loadEnv } from "./lib/env";
loadEnv();
import fs from "node:fs";
import path from "node:path";
import { createDb } from "../src/lib/db";
import { exportBackup } from "../src/lib/data/backup";

async function main() {
  const url = process.env.DATABASE_URL || "file:./var/imi.db";
  const dir = path.resolve(process.env.BACKUP_DIR || "./backups");
  fs.mkdirSync(dir, { recursive: true });
  const db = createDb(url);
  try {
    const data = await exportBackup(db);
    const stamp = data.exportedAt.replace(/[:.]/g, "-");
    const file = path.join(dir, `backup-${stamp}-manual.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
    console.log(`✓ JSON backup: ${file} (${data.snapshots.length} snapshots)`);
    if (process.argv.includes("--sqlite") && url.startsWith("file:")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SQLite = require("better-sqlite3");
      const src = new SQLite(url.replace(/^file:/, ""), { readonly: true });
      const target = path.join(dir, `imi-${stamp}.db`);
      await src.backup(target);
      src.close();
      fs.chmodSync(target, 0o600);
      console.log(`✓ SQLite copy: ${target} (contains admin password hashes — store securely)`);
    }
  } finally {
    await db.destroy();
  }
}
main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});

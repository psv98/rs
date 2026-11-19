/**
 * Restores ALL snapshots from a JSON backup (replaces the current snapshots).
 *   npm run db:restore -- backups/backup-....json
 * A safety backup of the current state is written first.
 */
import { loadEnv } from "./lib/env";
loadEnv();
import fs from "node:fs";
import path from "node:path";
import { createDb } from "../src/lib/db";
import { exportBackup, parseBackup, restoreFullBackup } from "../src/lib/data/backup";
import { ask } from "./lib/prompt";

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Вкажіть файл: npm run db:restore -- backups/backup-….json");
  const backup = parseBackup(JSON.parse(fs.readFileSync(file, "utf8")));
  const db = createDb(process.env.DATABASE_URL || "file:./var/imi.db");
  try {
    const published = backup.snapshots.filter((s) => s.status === "published").map((s) => `${s.periodKey} (${s.data.totalCrimes})`);
    console.log(`Копія від ${backup.exportedAt}: ${backup.snapshots.length} знімків, опубліковано: ${published.join(", ") || "—"}`);
    if (!process.argv.includes("--yes")) {
      const answer = await ask("Поточні знімки буде замінено. Введіть RESTORE для підтвердження: ");
      if (answer.trim() !== "RESTORE") throw new Error("Скасовано.");
    }
    const dir = path.resolve(process.env.BACKUP_DIR || "./backups");
    fs.mkdirSync(dir, { recursive: true });
    const safety = await exportBackup(db);
    const safetyFile = path.join(dir, `backup-${safety.exportedAt.replace(/[:.]/g, "-")}-before-restore.json`);
    fs.writeFileSync(safetyFile, JSON.stringify(safety, null, 2), { mode: 0o600 });
    console.log(`✓ Страхувальна копія поточного стану: ${safetyFile}`);
    await restoreFullBackup(db, backup, "cli");
    console.log("✓ Відновлено.");
  } finally {
    await db.destroy();
  }
}
main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});

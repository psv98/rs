/**
 * Writes the current publications from the local database into
 * data/published/snapshots.json — the file the GitHub Pages build publishes.
 *   npm run pages:export   →  then commit & push; the site rebuilds automatically.
 */
import { loadEnv } from "./lib/env";
loadEnv();
import fs from "node:fs";
import { createDb } from "../src/lib/db";
import { buildPublishedFile, parsePublishedFile, PUBLISHED_FILE } from "../src/lib/data/published-file";

(async () => {
  const db = createDb(process.env.DATABASE_URL || "file:./var/imi.db");
  try {
    const file = await buildPublishedFile(db);
    const check = parsePublishedFile(file); // same checks as the static build
    if (check.skipped.length) throw new Error(`не готові до публікації: ${check.skipped.map((x) => x.asOfDate).join(", ")}`);
    fs.mkdirSync("data/published", { recursive: true });
    fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(file, null, 2) + "\n");
    console.log(`✓ ${PUBLISHED_FILE}: ${file.snapshots.map((s) => `${s.data.asOfDate} (${s.data.totalCrimes})`).join(", ") || "—"}`);
  } finally {
    await db.destroy();
  }
})().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});

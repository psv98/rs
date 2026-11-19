/**
 * Loads the starting dataset (IMI, as of 24 Oct 2026) as a snapshot "on review".
 * It is NOT published automatically: the editor must confirm the source check and
 * explain the category-sum discrepancy in the admin panel, then publish.
 *
 *   npm run db:seed                       → 24.10.2026 snapshot (review) + 24.09.2026 candidate (draft)
 *   npm run db:seed -- --local-preview    → development only: publishes 24.10.2026 with a
 *                                           clearly marked placeholder explanation so the
 *                                           public pages can be previewed locally.
 */
import { loadEnv } from "./lib/env";
loadEnv();
import fs from "node:fs";
import { createDb } from "../src/lib/db";
import { insertSnapshot, audit } from "../src/lib/data/repository";
import { snapshotDataSchema } from "../src/lib/data/schema";

async function main() {
  const preview = process.argv.includes("--local-preview");
  if (preview && process.env.NODE_ENV === "production") throw new Error("--local-preview is disabled in production");
  const db = createDb(process.env.DATABASE_URL || "file:./var/imi.db");
  try {
    const existing = await db.selectFrom("snapshot").select("id").limit(1).execute();
    if (existing.length && !process.argv.includes("--force")) {
      console.log("Snapshots already exist — nothing to do (use --force to add the seed anyway).");
      return;
    }
    const actor = { username: "seed", ip: null };
    const oct = snapshotDataSchema.parse(JSON.parse(fs.readFileSync("data/seed/2026-10-24.json", "utf8")));
    const sep = snapshotDataSchema.parse(JSON.parse(fs.readFileSync("data/seed/2026-09-24.candidate.json", "utf8")));

    const sepId = await insertSnapshot(db, sep, actor, { status: "draft", changeNote: "Кандидат в історичний знімок — потребує звірки" });
    await audit(db, actor, "seed", sepId, { status: "draft" });

    if (preview) {
      const marker = "[ЛОКАЛЬНИЙ ПЕРЕГЛЯД] Пояснення розбіжності має підтвердити редактор ІМІ.";
      const markerEn = "[LOCAL PREVIEW] The explanation must be confirmed by an IMI editor.";
      const data = { ...oct, verification: { ...oct.verification, sourceChecked: true, sumMismatchConfirmed: true, sumMismatchExplanation: { uk: marker, en: markerEn } } };
      const id = await insertSnapshot(db, data, actor, { status: "published", changeNote: "LOCAL PREVIEW — not an editorial publication" });
      await audit(db, actor, "seed", id, { status: "published", localPreview: true });
      console.log(`✓ 24.10.2026 published for LOCAL PREVIEW (#${id}). Do not use this database in production.`);
    } else {
      const id = await insertSnapshot(db, oct, actor, { status: "review", changeNote: "Стартовий набір даних ІМІ" });
      await audit(db, actor, "seed", id, { status: "review" });
      console.log(`✓ 24.10.2026 loaded for review (#${id}). Confirm and publish it in /admin.`);
    }
    console.log(`✓ 24.09.2026 candidate loaded as draft (#${sepId}).`);
  } finally {
    await db.destroy();
  }
}
main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});

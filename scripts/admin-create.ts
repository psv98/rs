/**
 * Creates the (single) administrator, or resets their password with --reset.
 * The password is read interactively (not echoed) and stored only as an Argon2id hash.
 *   npm run admin:create
 *   npm run admin:create -- --reset
 */
import { loadEnv } from "./lib/env";
loadEnv();
import { createDb } from "../src/lib/db";
import { hashPassword, passwordProblems } from "../src/lib/auth/password";
import { destroyAllSessionsForUser } from "../src/lib/auth/session";
import { ask } from "./lib/prompt";

async function main() {
  const reset = process.argv.includes("--reset");
  const db = createDb(process.env.DATABASE_URL || "file:./var/imi.db");
  try {
    const username = (await ask("Ім'я адміністратора (латиниця, 3–32 символи): ")).trim();
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) throw new Error("Некоректне ім'я користувача.");
    const existing = await db.selectFrom("admin_user").selectAll().where("username", "=", username).executeTakeFirst();
    if (reset && !existing) throw new Error("Користувача не знайдено.");
    if (!reset && existing) throw new Error("Такий користувач уже існує. Для зміни пароля: npm run admin:create -- --reset");
    const count = await db.selectFrom("admin_user").select((eb) => eb.fn.countAll().as("n")).executeTakeFirst();
    if (!reset && Number(count?.n ?? 0) > 0 && !process.argv.includes("--additional")) {
      throw new Error("Адміністратора вже створено. Щоб додати ще одного, запустіть з прапорцем --additional.");
    }
    const password = await ask("Пароль (не відображається): ", true);
    const problems = passwordProblems(password, username);
    if (problems.length) throw new Error(problems.join("\n"));
    const repeat = await ask("Повторіть пароль: ", true);
    if (repeat !== password) throw new Error("Паролі не збігаються.");
    const hash = await hashPassword(password);
    if (existing) {
      await db.updateTable("admin_user").set({ password_hash: hash, disabled: 0 }).where("id", "=", existing.id).execute();
      await destroyAllSessionsForUser(db, existing.id);
      console.log(`✓ Пароль для «${username}» змінено, усі активні сесії завершено.`);
    } else {
      await db.insertInto("admin_user").values({ username, password_hash: hash, created_at: new Date().toISOString(), last_login_at: null, disabled: 0 }).execute();
      console.log(`✓ Адміністратора «${username}» створено. Вхід: /admin/login`);
    }
    await db.insertInto("audit_log").values({ at: new Date().toISOString(), username: "cli", action: reset ? "admin.password-reset" : "admin.create", snapshot_id: null, details: JSON.stringify({ username }), ip: null }).execute();
  } finally {
    await db.destroy();
  }
}
main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});

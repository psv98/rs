import { Kysely, PostgresAdapter, sql, type ColumnDefinitionBuilder } from "kysely";
import { Migrator, type Migration, type MigrationProvider } from "kysely/migration";

function isPostgres(db: Kysely<unknown>) {
  return db.getExecutor().adapter instanceof PostgresAdapter;
}

/** Auto-increment primary key that works on both dialects. */
function idColumn(db: Kysely<unknown>) {
  const pg = isPostgres(db);
  return (c: ColumnDefinitionBuilder) => (pg ? c.primaryKey().generatedByDefaultAsIdentity() : c.primaryKey().autoIncrement());
}

/**
 * Migrations are plain Kysely schema-builder code so the same files work on SQLite
 * (local) and PostgreSQL (production). Never edit a migration that has shipped —
 * add a new one.
 */
const migrations: Record<string, Migration> = {
  "001_initial": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("admin_user")
        .addColumn("id", "integer", idColumn(db))
        .addColumn("username", "varchar(64)", (c) => c.notNull().unique())
        .addColumn("password_hash", "text", (c) => c.notNull())
        .addColumn("created_at", "varchar(32)", (c) => c.notNull())
        .addColumn("last_login_at", "varchar(32)")
        .addColumn("disabled", "integer", (c) => c.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("session")
        .addColumn("id", "varchar(64)", (c) => c.primaryKey())
        .addColumn("user_id", "integer", (c) => c.notNull().references("admin_user.id").onDelete("cascade"))
        .addColumn("csrf_token", "varchar(64)", (c) => c.notNull())
        .addColumn("created_at", "varchar(32)", (c) => c.notNull())
        .addColumn("last_seen_at", "varchar(32)", (c) => c.notNull())
        .addColumn("expires_at", "varchar(32)", (c) => c.notNull())
        .addColumn("ip", "varchar(64)")
        .addColumn("user_agent", "varchar(256)")
        .execute();

      await db.schema
        .createTable("login_throttle")
        .addColumn("key", "varchar(160)", (c) => c.primaryKey())
        .addColumn("failures", "integer", (c) => c.notNull())
        .addColumn("window_start", "varchar(32)", (c) => c.notNull())
        .addColumn("locked_until", "varchar(32)")
        .execute();

      await db.schema
        .createTable("snapshot")
        .addColumn("id", "integer", idColumn(db))
        .addColumn("period_key", "varchar(10)", (c) => c.notNull())
        .addColumn("revision", "integer", (c) => c.notNull())
        .addColumn("status", "varchar(16)", (c) => c.notNull())
        .addColumn("data", "text", (c) => c.notNull())
        .addColumn("checksum", "varchar(64)", (c) => c.notNull())
        .addColumn("change_note", "text", (c) => c.notNull().defaultTo(""))
        .addColumn("based_on_id", "integer")
        .addColumn("created_at", "varchar(32)", (c) => c.notNull())
        .addColumn("created_by", "varchar(64)", (c) => c.notNull())
        .addColumn("updated_at", "varchar(32)", (c) => c.notNull())
        .addColumn("updated_by", "varchar(64)", (c) => c.notNull())
        .addColumn("submitted_at", "varchar(32)")
        .addColumn("published_at", "varchar(32)")
        .addColumn("published_by", "varchar(64)")
        .execute();
      await db.schema.createIndex("snapshot_status_idx").on("snapshot").columns(["status", "period_key"]).execute();
      // Database-level guarantee: at most one published revision per period.
      await sql`CREATE UNIQUE INDEX snapshot_one_published_per_period ON snapshot (period_key) WHERE status = 'published'`.execute(db);

      await db.schema
        .createTable("audit_log")
        .addColumn("id", "integer", idColumn(db))
        .addColumn("at", "varchar(32)", (c) => c.notNull())
        .addColumn("username", "varchar(64)", (c) => c.notNull())
        .addColumn("action", "varchar(48)", (c) => c.notNull())
        .addColumn("snapshot_id", "integer")
        .addColumn("details", "text", (c) => c.notNull())
        .addColumn("ip", "varchar(64)")
        .execute();
      await db.schema.createIndex("audit_log_at_idx").on("audit_log").column("at").execute();
    },
    async down(db: Kysely<unknown>) {
      for (const t of ["audit_log", "snapshot", "login_throttle", "session", "admin_user"]) {
        await db.schema.dropTable(t).ifExists().execute();
      }
    },
  },
};

class StaticProvider implements MigrationProvider {
  async getMigrations() {
    return migrations;
  }
}

export async function migrateToLatest(db: Kysely<unknown>) {
  const migrator = new Migrator({ db, provider: new StaticProvider() });
  const { error, results } = await migrator.migrateToLatest();
  if (error) throw error;
  return results ?? [];
}

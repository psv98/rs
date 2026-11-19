import type { Generated } from "kysely";

/** Timestamps are stored as ISO-8601 strings (UTC) for SQLite/PostgreSQL portability. */
export interface AdminUserTable {
  id: Generated<number>;
  username: string;
  password_hash: string;
  created_at: string;
  last_login_at: string | null;
  disabled: number;
}

export interface SessionTable {
  /** SHA-256 of the session token; the raw token only lives in the cookie. */
  id: string;
  user_id: number;
  csrf_token: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

export interface LoginThrottleTable {
  key: string;
  failures: number;
  window_start: string;
  locked_until: string | null;
}

export type SnapshotStatus = "draft" | "review" | "published" | "superseded" | "withdrawn";

export interface SnapshotTable {
  id: Generated<number>;
  /** = data.asOfDate (YYYY-MM-DD). One published revision per period key. */
  period_key: string;
  revision: number;
  status: SnapshotStatus;
  /** JSON-serialised SnapshotData. */
  data: string;
  /** SHA-256 of the canonical JSON of `data`. */
  checksum: string;
  change_note: string;
  based_on_id: number | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  submitted_at: string | null;
  published_at: string | null;
  published_by: string | null;
}

export interface AuditLogTable {
  id: Generated<number>;
  at: string;
  username: string;
  action: string;
  snapshot_id: number | null;
  details: string;
  ip: string | null;
}

export interface Database {
  admin_user: AdminUserTable;
  session: SessionTable;
  login_throttle: LoginThrottleTable;
  snapshot: SnapshotTable;
  audit_log: AuditLogTable;
}

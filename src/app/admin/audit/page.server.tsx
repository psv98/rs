import { requireAdminPage } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { listAudit } from "@/lib/data/repository";
import { formatDateTime } from "@/lib/data/dates";
import { AdminShell } from "@/components/admin/AdminShell";
import { ACTION_LABEL } from "@/components/admin/labels";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await requireAdminPage();
  const rows = await listAudit(getDb(), 300);
  return (
    <AdminShell username={session.username} csrf={session.csrfToken} current="audit">
      <h1>Журнал змін</h1>
      <p className="muted">Останні 300 подій: входи, редагування, публікації, відкати, резервні копії. Записи журналу не редагуються з інтерфейсу.</p>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto", marginTop: "1rem" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Час (Київ)</th>
              <th>Користувач</th>
              <th>Дія</th>
              <th>Знімок</th>
              <th>Деталі</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateTime(r.at, "uk")}</td>
                <td>{r.username}</td>
                <td>{ACTION_LABEL[r.action] ?? r.action}</td>
                <td>{r.snapshot_id ? <a className="link" href={`/admin/snapshots/${r.snapshot_id}`}>#{r.snapshot_id}</a> : "—"}</td>
                <td className="muted" style={{ maxWidth: "26rem", wordBreak: "break-word", fontSize: "0.875rem" }}>
                  {r.details !== "{}" ? r.details : ""}
                </td>
                <td className="muted">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

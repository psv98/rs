import { requireAdminPage } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { integrityReport, listSnapshots } from "@/lib/data/repository";
import { formatDateTime, formatLongDate } from "@/lib/data/dates";
import { AdminShell } from "@/components/admin/AdminShell";
import { NewDraftButton } from "@/components/admin/NewDraftButton";
import { STATUS_LABEL } from "@/components/admin/labels";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireAdminPage();
  const db = getDb();
  const [items, integrity] = await Promise.all([listSnapshots(db), integrityReport(db)]);
  const published = items.filter((s) => s.status === "published").sort((a, b) => (a.periodKey < b.periodKey ? 1 : -1));
  const current = published[0] ?? null;
  const broken = integrity.filter((r) => !r.checksumOk || !r.schemaOk);
  const working = items.filter((s) => s.status === "draft" || s.status === "review");
  return (
    <AdminShell username={session.username} csrf={session.csrfToken} current="home">
      <div className="adm-bar" style={{ marginTop: 0 }}>
        <div>
          <h1>Статистичні знімки</h1>
          <p className="muted">Чернетка → Перевірка → Публікація. Публічний сайт показує лише опубліковані знімки.</p>
        </div>
        <div className="adm-actions">
          <NewDraftButton csrf={session.csrfToken} fromId={current?.id ?? null} label={current ? "Новий щомісячний знімок (копія поточного)" : "Новий знімок"} primary />
        </div>
      </div>

      {broken.length > 0 && (
        <div className="adm-card" style={{ borderColor: "var(--color-signal)", marginTop: "1rem" }} role="alert">
          <b>Перевірка цілісності:</b> {broken.length} знімк(ів) мають невідповідну контрольну суму або формат: {broken.map((b) => `#${b.id}`).join(", ")}. Такі знімки не показуються на сайті. Відновіть дані з резервної копії.
        </div>
      )}

      <h2>На сайті зараз</h2>
      {current ? (
        <div className="adm-card" style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "3.2rem", color: "var(--color-signal)", lineHeight: 1 }}>{current.data.totalCrimes}</div>
          <div>
            <div>
              Станом на <b>{formatLongDate(current.periodKey, "uk")}</b> · редакція {current.revision}
            </div>
            <div className="muted">
              Опубліковано {current.publishedAt ? formatDateTime(current.publishedAt, "uk") : "—"} ({current.publishedBy})
            </div>
          </div>
          <a className="btn" href={`/admin/snapshots/${current.id}`} style={{ marginLeft: "auto" }}>
            Відкрити
          </a>
        </div>
      ) : (
        <div className="adm-card">
          Ще нічого не опубліковано — публічна сторінка показує повідомлення «Дані готуються до публікації».
          {working.length > 0 && " Відкрийте знімок нижче, перевірте його та опублікуйте."}
        </div>
      )}

      <h2>Усі знімки</h2>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Станом на</th>
              <th>Ред.</th>
              <th>Статус</th>
              <th className="num">Головний показник</th>
              <th>Оновлено</th>
              <th>Примітка</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td className="muted">{s.id}</td>
                <td>{formatLongDate(s.periodKey, "uk")}</td>
                <td>{s.revision}</td>
                <td>
                  <span className="adm-badge" data-s={s.status}>
                    {STATUS_LABEL[s.status]}
                  </span>
                  {!s.checksumValid && <span className="adm-error"> контрольна сума!</span>}
                </td>
                <td className="num">{s.data.totalCrimes}</td>
                <td className="muted">
                  {formatDateTime(s.updatedAt, "uk")}
                  <br />
                  {s.updatedBy}
                </td>
                <td className="muted" style={{ maxWidth: "18rem" }}>{s.changeNote}</td>
                <td>
                  <a className="btn" href={`/admin/snapshots/${s.id}`}>
                    {s.status === "draft" ? "Редагувати" : "Відкрити"}
                  </a>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Немає знімків. Завантажте стартові дані командою <code>npm run db:seed</code> або імпортуйте резервну копію.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

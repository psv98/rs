"use client";
import { useState } from "react";
import { api } from "./api";

export function BackupTools({ csrf }: { csrf: string }) {
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [report, setReport] = useState<Array<{ id: number; periodKey: string; status: string; checksumOk: boolean; schemaOk: boolean }> | null>(null);
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Експорт</h2>
        <p className="muted">Повна копія всіх знімків (чернетки, публікації та історія) у форматі JSON. Облікові дані адміністратора до копії не входять.</p>
        <p style={{ marginTop: "0.75rem" }}>
          <a className="btn btn--primary" href="/api/admin/backup" download>
            Завантажити JSON
          </a>
        </p>
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Імпорт як чернетки</h2>
        <p className="muted">
          Кожен знімок із файлу буде додано як <b>чернетку</b> — після імпорту нічого не публікується. Повне відновлення сайту зі статусами виконується з сервера: <code>npm run db:restore -- файл.json</code>.
        </p>
        <input
          className="adm-input"
          style={{ marginTop: "0.75rem" }}
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setMsg(null);
            try {
              if (file.size > 10 * 1024 * 1024) throw new Error("Файл більший за 10 МБ");
              const json = JSON.parse(await file.text());
              if (!window.confirm(`Імпортувати ${json?.snapshots?.length ?? "?"} знімків як чернетки?`)) return;
              const r = await api<{ imported: number }>(csrf, "/api/admin/backup", "POST", json);
              setMsg({ kind: "ok", text: `Імпортовано чернеток: ${r.imported}.` });
            } catch (err) {
              setMsg({ kind: "error", text: (err as Error).message });
            } finally {
              e.target.value = "";
            }
          }}
        />
        {msg && (
          <p role="status" className={msg.kind === "error" ? "adm-error" : ""} style={{ marginTop: "0.75rem" }}>
            {msg.text}
          </p>
        )}
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Перевірка цілісності</h2>
        <p className="muted">Перераховує контрольні суми всіх знімків і перевіряє формат даних.</p>
        <p style={{ marginTop: "0.75rem" }}>
          <button type="button" className="btn" onClick={async () => setReport((await api<{ report: typeof report }>(csrf, "/api/admin/integrity")).report)}>
            Перевірити
          </button>
        </p>
        {report && (
          <table className="adm-table" style={{ marginTop: "0.75rem" }}>
            <tbody>
              {report.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.periodKey}</td>
                  <td>{r.status}</td>
                  <td>{r.checksumOk && r.schemaOk ? "✓ гаразд" : <span className="adm-error">пошкоджено</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { api } from "./api";

export function NewDraftButton({ csrf, fromId, label, primary = false }: { csrf: string; fromId: number | null; label: string; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className={`btn${primary ? " btn--primary" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await api<{ id: number }>(csrf, "/api/admin/snapshots", "POST", { fromId, changeNote: "" });
            window.location.href = `/admin/snapshots/${r.id}`;
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Створюємо…" : label}
      </button>
      {error && <span className="adm-error">{error}</span>}
    </>
  );
}

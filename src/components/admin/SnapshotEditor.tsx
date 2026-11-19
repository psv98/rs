"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SnapshotData, Category } from "@/lib/data/schema";
import type { SnapshotStatus } from "@/lib/db/types";
import { validateSnapshot, type Issue } from "@/lib/data/validation";
import { diffSnapshots } from "@/lib/data/diff";
import { formatDateTime, formatLongDate, suggestPeriodLabel } from "@/lib/data/dates";
import { CATEGORY_ICON_IDS } from "@/lib/icons/category-icons.generated";
import { planSlides } from "@/lib/export/plan";
import { CategoryIcon } from "../ui/CategoryIcon";
import { api, ApiError } from "./api";
import { STATUS_LABEL } from "./labels";

interface Rec {
  id: number;
  periodKey: string;
  revision: number;
  status: SnapshotStatus;
  data: SnapshotData;
  checksum: string;
  checksumValid: boolean;
  changeNote: string;
  basedOnId: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  submittedAt: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
}
type Ref = { id: number; periodKey: string; data: SnapshotData } | null;
type Tab = "main" | "categories" | "history" | "texts" | "check" | "preview" | "diff";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

export function SnapshotEditor({
  csrf,
  snapshot,
  previous,
  samePeriodPublished,
  currentPublic,
  today,
}: {
  csrf: string;
  snapshot: Rec;
  previous: Ref;
  samePeriodPublished: Ref;
  currentPublic: Ref;
  today: string;
}) {
  const [rec, setRec] = useState<Rec>(snapshot);
  const [data, setData] = useState<SnapshotData>(clone(snapshot.data));
  const [changeNote, setChangeNote] = useState(snapshot.changeNote);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>(snapshot.status === "review" ? "check" : "main");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string; issues?: Issue[] } | null>(null);
  const [dialog, setDialog] = useState<null | "publish" | "withdraw" | "restore" | "delete">(null);

  const editable = rec.status === "draft";
  const verifEditable = rec.status === "draft" || rec.status === "review";
  const v = useMemo(() => validateSnapshot(data, { previous: previous?.data ?? null, today }), [data, previous, today]);
  const errors = v.issues.filter((i) => i.severity === "error");

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!toast || toast.kind === "error") return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (fn: (d: SnapshotData) => void) => {
    setData((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      setToast({ kind: "ok", text: ok });
    } catch (e) {
      const err = e as ApiError;
      const issues = Array.isArray(err.details) && (err.details as Issue[])[0]?.severity ? (err.details as Issue[]) : undefined;
      setToast({ kind: "error", text: err.message, issues });
    } finally {
      setBusy(false);
    }
  };

  const applyRec = (r: Rec) => {
    setRec(r);
    setData(clone(r.data));
    setChangeNote(r.changeNote);
    setDirty(false);
  };

  const save = () =>
    run(async () => {
      const r = await api<{ snapshot: Rec }>(csrf, `/api/admin/snapshots/${rec.id}`, "PUT", { data, expectedUpdatedAt: rec.updatedAt, changeNote });
      applyRec(r.snapshot);
    }, "Чернетку збережено");

  const saveVerification = () =>
    run(async () => {
      const r = await api<{ snapshot: Rec }>(csrf, `/api/admin/snapshots/${rec.id}/verification`, "PUT", { verification: data.verification, expectedUpdatedAt: rec.updatedAt });
      applyRec(r.snapshot);
    }, "Підтвердження збережено");

  const action = (body: Record<string, string>, ok: string, after?: () => void) =>
    run(async () => {
      const r = await api<{ snapshot: Rec }>(csrf, `/api/admin/snapshots/${rec.id}/action`, "POST", body);
      applyRec(r.snapshot);
      setDialog(null);
      after?.();
    }, ok);

  const step = rec.status === "draft" ? 0 : rec.status === "review" ? 1 : 2;
  const diffBase = samePeriodPublished ?? currentPublic;
  const changes = diffBase && diffBase.id !== rec.id ? diffSnapshots(diffBase.data, data) : [];

  return (
    <div>
      <div className="adm-bar" style={{ marginTop: 0 }}>
        <div>
          <p className="muted">
            <a className="link" href="/admin">
              Знімки
            </a>{" "}
            / #{rec.id}
          </p>
          <h1>
            Станом на {formatLongDate(data.asOfDate, "uk")} <span className="muted" style={{ fontSize: "1rem" }}>редакція {rec.revision}</span>
          </h1>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <span className="adm-badge" data-s={rec.status}>
              {STATUS_LABEL[rec.status]}
            </span>
            <span className="adm-steps" aria-label="Етапи">
              <span data-on={step === 0} data-done={step > 0}>Чернетка</span>→<span data-on={step === 1} data-done={step > 1}>Перевірка</span>→
              <span data-on={step === 2}>Публікація</span>
            </span>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              Оновлено {formatDateTime(rec.updatedAt, "uk")} ({rec.updatedBy})
            </span>
            {!rec.checksumValid && <span className="adm-error">Контрольна сума не збігається!</span>}
          </div>
        </div>
        <div className="adm-actions">
          {rec.status === "draft" && (
            <>
              <button className="btn btn--primary" disabled={busy || !dirty} onClick={save}>
                {dirty ? "Зберегти чернетку" : "Збережено"}
              </button>
              <button
                className="btn"
                disabled={busy || dirty || !v.canSubmit}
                title={dirty ? "Спершу збережіть зміни" : !v.canSubmit ? "Виправте помилки в даних" : ""}
                onClick={() => action({ action: "submit" }, "Передано на перевірку", () => setTab("check"))}
              >
                Передати на перевірку
              </button>
              <button className="btn btn--danger" disabled={busy} onClick={() => setDialog("delete")}>
                Видалити
              </button>
            </>
          )}
          {rec.status === "review" && (
            <>
              <button className="btn" disabled={busy} onClick={() => action({ action: "return" }, "Повернуто в чернетку")}>
                Повернути в чернетку
              </button>
              <button className="btn btn--primary" disabled={busy || dirty || !v.canPublish} title={!v.canPublish ? "Є незакриті пункти перевірки" : ""} onClick={() => setDialog("publish")}>
                Опублікувати
              </button>
            </>
          )}
          {rec.status === "published" && (
            <>
              <NewDraft csrf={csrf} fromId={rec.id} label="Створити виправлену версію" />
              <button className="btn btn--danger" disabled={busy} onClick={() => setDialog("withdraw")}>
                Зняти з публікації
              </button>
            </>
          )}
          {(rec.status === "superseded" || rec.status === "withdrawn") && (
            <>
              {rec.publishedAt && (
                <button className="btn btn--primary" disabled={busy} onClick={() => setDialog("restore")}>
                  Відновити цю версію на сайті
                </button>
              )}
              <NewDraft csrf={csrf} fromId={rec.id} label="Чернетка на основі цієї версії" />
            </>
          )}
        </div>
      </div>

      {!editable && (
        <p className="adm-card" style={{ marginTop: "1rem" }}>
          {rec.status === "review"
            ? "Дані заблоковано для перевірки. Можна змінювати лише підтвердження на вкладці «Перевірка». Щоб змінити цифри, поверніть знімок у чернетку."
            : "Опубліковані та архівні версії не змінюються. Для виправлення створіть нову версію — попередня залишиться в історії."}
        </p>
      )}

      <div className="adm-tabs" role="tablist">
        {(
          [
            ["main", "Основне"],
            ["categories", `Категорії (${data.categories.length})`],
            ["history", `Динаміка (${data.history.points.length})`],
            ["texts", "Тексти UA/EN"],
            ["check", "Перевірка"],
            ["preview", "Попередній перегляд"],
            ["diff", `Зміни${changes.length ? ` (${changes.length})` : ""}`],
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
            {k === "check" && errors.length > 0 && <span className="count">{errors.length}</span>}
          </button>
        ))}
      </div>

      {tab === "main" && <MainTab data={data} update={update} editable={editable} changeNote={changeNote} setChangeNote={(s) => (setChangeNote(s), setDirty(true))} issues={v.issues} />}
      {tab === "categories" && <CategoriesTab data={data} update={update} editable={editable} />}
      {tab === "history" && <HistoryTab data={data} update={update} editable={editable} />}
      {tab === "texts" && <TextsTab data={data} update={update} editable={editable} />}
      {tab === "check" && (
        <CheckTab
          data={data}
          update={update}
          editable={verifEditable}
          issues={v.issues}
          sum={v.categorySum}
          total={data.totalCrimes}
          status={rec.status}
          dirty={dirty}
          busy={busy}
          onSaveVerification={rec.status === "review" ? saveVerification : save}
        />
      )}
      {tab === "preview" && <PreviewTab id={rec.id} data={data} dirty={dirty} checksum={rec.checksum} />}
      {tab === "diff" && <DiffTab changes={changes} base={diffBase} />}

      {dialog && (
        <ConfirmDialog
          kind={dialog}
          periodKey={rec.periodKey}
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={async (confirmation, reason) => {
            if (dialog === "publish") await action({ action: "publish", confirmation }, "Опубліковано. Сайт уже показує нові дані.");
            if (dialog === "withdraw") await action({ action: "withdraw", confirmation, reason }, "Знято з публікації");
            if (dialog === "restore") await action({ action: "restore", confirmation, reason }, "Версію відновлено на сайті");
            if (dialog === "delete")
              await run(async () => {
                await api(csrf, `/api/admin/snapshots/${rec.id}`, "DELETE", {});
                window.location.href = "/admin";
              }, "Чернетку видалено");
          }}
        />
      )}

      {toast && (
        <div className="adm-toast" data-kind={toast.kind} role={toast.kind === "error" ? "alert" : "status"}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <b>{toast.text}</b>
            <button onClick={() => setToast(null)} aria-label="Закрити">
              ✕
            </button>
          </div>
          {toast.issues && (
            <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-ash)" }}>
              {toast.issues
                .filter((i) => i.severity === "error")
                .slice(0, 6)
                .map((i, n) => (
                  <li key={n}>• {i.message}</li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NewDraft({ csrf, fromId, label }: { csrf: string; fromId: number; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api<{ id: number }>(csrf, "/api/admin/snapshots", "POST", { fromId, changeNote: `На основі #${fromId}` });
          window.location.href = `/admin/snapshots/${r.id}`;
        } catch (e) {
          alert((e as Error).message);
          setBusy(false);
        }
      }}
    >
      {label}
    </button>
  );
}

function issuesFor(issues: Issue[], prefix: string) {
  return issues.filter((i) => i.field?.startsWith(prefix) && i.severity === "error");
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export type Upd = (fn: (d: SnapshotData) => void) => void;

export function MainTab({
  data,
  update,
  editable,
  changeNote,
  setChangeNote,
  issues,
  hideChangeNote = false,
}: {
  data: SnapshotData;
  update: Upd;
  editable: boolean;
  changeNote: string;
  setChangeNote: (s: string) => void;
  issues: Issue[];
  hideChangeNote?: boolean;
}) {
  const bad = (p: string) => (issuesFor(issues, p).length ? "true" : undefined);
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="adm-card">
        <div className="adm-grid">
          <Field label="Головний показник (злочинів)" hint="Як у публікації ІМІ. Не розраховується з категорій.">
            <input className="adm-input num num--lead" type="number" min={0} disabled={!editable} value={Number.isFinite(data.totalCrimes) ? data.totalCrimes : ""} aria-invalid={bad("totalCrimes")} onChange={(e) => update((d) => void (d.totalCrimes = e.target.value === "" ? Number.NaN : Number(e.target.value)))} />
          </Field>
          <Field label="Станом на" hint="Дата, на яку актуальні дані">
            <input className="adm-input" type="date" disabled={!editable} value={data.asOfDate} aria-invalid={bad("asOfDate")} onChange={(e) => update((d) => void (d.asOfDate = e.target.value))} />
          </Field>
          <Field label="Початок моніторингу">
            <input className="adm-input" type="date" disabled={!editable} value={data.monitoringStart} onChange={(e) => update((d) => void (d.monitoringStart = e.target.value))} />
          </Field>
        </div>
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Останній звітний період</h2>
        <div className="adm-grid">
          <Field label="Початок періоду">
            <input className="adm-input" type="date" disabled={!editable} value={data.period.start ?? ""} aria-invalid={bad("period")} onChange={(e) => update((d) => void (d.period.start = e.target.value || null))} />
          </Field>
          <Field label="Кінець періоду">
            <input className="adm-input" type="date" disabled={!editable} value={data.period.end ?? ""} onChange={(e) => update((d) => void (d.period.end = e.target.value || null))} />
          </Field>
          <Field label="Нових випадків за період" hint="Порожнє — не показувати">
            <input className="adm-input num" type="number" min={0} disabled={!editable} value={data.period.newCases ?? ""} onChange={(e) => update((d) => void (d.period.newCases = numOrNull(e.target.value)))} />
          </Field>
        </div>
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Загиблі медійники</h2>
        <div className="adm-grid">
          <Field label="Усього загинули" hint="Порожнє — не показувати">
            <input className="adm-input num" type="number" min={0} disabled={!editable} value={data.casualties.killedTotal ?? ""} onChange={(e) => update((d) => void (d.casualties.killedTotal = numOrNull(e.target.value)))} />
          </Field>
          <Field label="З них під час професійної діяльності">
            <input className="adm-input num" type="number" min={0} disabled={!editable} value={data.casualties.killedOnDuty ?? ""} aria-invalid={bad("casualties")} onChange={(e) => update((d) => void (d.casualties.killedOnDuty = numOrNull(e.target.value)))} />
          </Field>
        </div>
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Першоджерела</h2>
        <div className="adm-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Field label="Публікація ІМІ українською">
            <input className="adm-input" type="url" disabled={!editable} value={data.sources.articleUk} aria-invalid={bad("sources.articleUk")} onChange={(e) => update((d) => void (d.sources.articleUk = e.target.value))} />
          </Field>
          <Field label="Публікація ІМІ англійською">
            <input className="adm-input" type="url" disabled={!editable} value={data.sources.articleEn} onChange={(e) => update((d) => void (d.sources.articleEn = e.target.value))} />
          </Field>
          <Field label="Реєстр ІМІ">
            <input className="adm-input" type="url" disabled={!editable} value={data.sources.registry} onChange={(e) => update((d) => void (d.sources.registry = e.target.value))} />
          </Field>
          {!hideChangeNote && (
            <Field label="Примітка до версії (внутрішня)" hint="Що змінилося в цій версії — видно лише в адмінці">
              <input className="adm-input" maxLength={500} disabled={!editable} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}

export function CategoriesTab({ data, update, editable }: { data: SnapshotData; update: Upd; editable: boolean }) {
  const sorted = [...data.categories].map((c, idx) => ({ c, idx })).sort((a, b) => a.c.order - b.c.order);
  const move = (idx: number, dir: -1 | 1) =>
    update((d) => {
      const order = [...d.categories].map((c, i) => ({ c, i })).sort((a, b) => a.c.order - b.c.order);
      const pos = order.findIndex((o) => o.i === idx);
      const other = order[pos + dir];
      if (!other) return;
      const a = d.categories[idx]!;
      const b = d.categories[other.i]!;
      [a.order, b.order] = [b.order, a.order];
    });
  const sum = data.categories.filter((c) => !c.hidden).reduce((s, c) => s + (Number.isFinite(c.value) ? c.value : 0), 0);
  return (
    <div>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Сума видимих категорій: <b style={{ color: "var(--color-paper)" }}>{sum}</b>, головний показник: <b style={{ color: "var(--color-paper)" }}>{data.totalCrimes}</b>
      </p>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {sorted.map(({ c, idx }, pos) => (
          <div key={idx} className="adm-card" style={{ opacity: c.hidden ? 0.6 : 1 }}>
            <div className="adm-cat-row">
              <Field label="Іконка">
                <span className="adm-iconpick">
                  <CategoryIcon id={c.iconId} className="adm-cat-icon" />
                  <select className="adm-select" disabled={!editable} value={c.iconId} aria-label="Іконка" onChange={(e) => update((d) => void (d.categories[idx]!.iconId = e.target.value))}>
                    {CATEGORY_ICON_IDS.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </span>
              </Field>
              <Field label="Значення">
                <input className="adm-input num num--lead" aria-label="Значення" type="number" min={0} disabled={!editable} value={Number.isFinite(c.value) ? c.value : ""} onChange={(e) => update((d) => void (d.categories[idx]!.value = e.target.value === "" ? Number.NaN : Number(e.target.value)))} />
              </Field>
              <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Назва (UA)">
                  <input className="adm-input" disabled={!editable} maxLength={160} value={c.name.uk} aria-invalid={!c.name.uk && !c.hidden ? "true" : undefined} onChange={(e) => update((d) => void (d.categories[idx]!.name.uk = e.target.value))} />
                </Field>
                <Field label="Назва (EN)">
                  <input className="adm-input" disabled={!editable} maxLength={160} value={c.name.en} aria-invalid={!c.name.en && !c.hidden ? "true" : undefined} onChange={(e) => update((d) => void (d.categories[idx]!.name.en = e.target.value))} />
                </Field>
                <Field label="Пояснення (UA, необов'язково)">
                  <textarea className="adm-textarea" disabled={!editable} maxLength={600} value={c.description.uk} onChange={(e) => update((d) => void (d.categories[idx]!.description.uk = e.target.value))} />
                </Field>
                <Field label="Пояснення (EN)">
                  <textarea className="adm-textarea" disabled={!editable} maxLength={600} value={c.description.en} onChange={(e) => update((d) => void (d.categories[idx]!.description.en = e.target.value))} />
                </Field>
              </div>
              <div className="adm-cat-side">
                <div className="adm-order" role="group" aria-label="Порядок">
                  <button className="adm-iconbtn" disabled={!editable || pos === 0} onClick={() => move(idx, -1)} aria-label="Вище" title="Вище">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 3.5 8h3v4.5h3V8h3z" fill="currentColor" /></svg>
                  </button>
                  <button className="adm-iconbtn" disabled={!editable || pos === sorted.length - 1} onClick={() => move(idx, 1)} aria-label="Нижче" title="Нижче">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 12.5 8h-3V3.5h-3V8h-3z" fill="currentColor" /></svg>
                  </button>
                </div>
                <label className="adm-hide">
                  <input type="checkbox" disabled={!editable} checked={c.hidden} onChange={(e) => update((d) => void (d.categories[idx]!.hidden = e.target.checked))} />
                  Сховати
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editable && <AddCategory data={data} update={update} />}
    </div>
  );
}

function AddCategory({ data, update }: { data: SnapshotData; update: Upd }) {
  const [id, setId] = useState("");
  const ok = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && !data.categories.some((c) => c.id === id);
  return (
    <div className="adm-card" style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", alignItems: "end", flexWrap: "wrap" }}>
      <Field label="Нова категорія: постійний ідентифікатор" hint="латиниця, цифри, дефіс; змінити пізніше не можна — він використовується у посиланнях">
        <input className="adm-input" value={id} onChange={(e) => setId(e.target.value.toLowerCase())} placeholder="napryklad-nova-katehoriia" />
      </Field>
      <button
        className="btn"
        disabled={!ok}
        onClick={() => {
          const max = Math.max(0, ...data.categories.map((c) => c.order));
          const cat: Category = { id, iconId: CATEGORY_ICON_IDS[0]!, value: 0, order: max + 10, hidden: true, name: { uk: "", en: "" }, description: { uk: "", en: "" } };
          update((d) => void d.categories.push(cat));
          setId("");
        }}
      >
        Додати (прихованою)
      </button>
    </div>
  );
}

export function HistoryTab({ data, update, editable }: { data: SnapshotData; update: Upd; editable: boolean }) {
  const pts = data.history.points;
  const yrs = data.history.years;
  const sorted = pts.every((p, i) => i === 0 || pts[i - 1]!.date < p.date);
  const cell = { padding: "0.35rem 0.4rem", verticalAlign: "top" } as const;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Точки динаміки</h2>
        <p className="muted">
          Опубліковані раніше загальні показники ІМІ. З них сайт будує графік «Як змінювалися цифри» та картки років; поточний знімок додається до графіка автоматично. Кожна точка
          потребує посилання на публікацію ІМІ. Примітка показується на графіку (заповнюйте обидві мови або жодної).
        </p>
        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr className="muted" style={{ textAlign: "left" }}>
                <th style={cell}>Дата</th>
                <th style={cell}>Усього</th>
                <th style={cell}>Загинули</th>
                <th style={cell}>Під час роботи</th>
                <th style={cell}>Джерело</th>
                <th style={cell}>Примітка UA / EN</th>
                <th style={cell} />
              </tr>
            </thead>
            <tbody>
              {pts.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <td style={cell}>
                    <input className="adm-input" type="date" style={{ width: "9.5rem" }} disabled={!editable} value={p.date} onChange={(e) => update((d) => void (d.history.points[i]!.date = e.target.value))} />
                  </td>
                  <td style={cell}>
                    <input className="adm-input num" type="number" min={0} style={{ width: "6rem" }} disabled={!editable} value={p.total ?? ""} onChange={(e) => update((d) => void (d.history.points[i]!.total = numOrNull(e.target.value)))} />
                  </td>
                  <td style={cell}>
                    <input className="adm-input num" type="number" min={0} style={{ width: "5rem" }} disabled={!editable} value={p.killedTotal ?? ""} onChange={(e) => update((d) => void (d.history.points[i]!.killedTotal = numOrNull(e.target.value)))} />
                  </td>
                  <td style={cell}>
                    <input className="adm-input num" type="number" min={0} style={{ width: "5rem" }} disabled={!editable} value={p.killedOnDuty ?? ""} onChange={(e) => update((d) => void (d.history.points[i]!.killedOnDuty = numOrNull(e.target.value)))} />
                  </td>
                  <td style={cell}>
                    <input className="adm-input" type="url" style={{ minWidth: "14rem" }} disabled={!editable} value={p.source} aria-invalid={!p.source ? "true" : undefined} onChange={(e) => update((d) => void (d.history.points[i]!.source = e.target.value.trim()))} />
                  </td>
                  <td style={cell}>
                    <div style={{ display: "grid", gap: "0.3rem", minWidth: "14rem" }}>
                      <input className="adm-input" maxLength={300} disabled={!editable} value={p.note.uk} placeholder="UA" onChange={(e) => update((d) => void (d.history.points[i]!.note.uk = e.target.value))} />
                      <input className="adm-input" maxLength={300} disabled={!editable} value={p.note.en} placeholder="EN" onChange={(e) => update((d) => void (d.history.points[i]!.note.en = e.target.value))} />
                    </div>
                  </td>
                  <td style={cell}>
                    <button className="btn" disabled={!editable} aria-label={`Видалити точку ${p.date}`} onClick={() => update((d) => void d.history.points.splice(i, 1))}>
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn" onClick={() => update((d) => void d.history.points.push({ date: "", total: null, killedTotal: null, killedOnDuty: null, note: { uk: "", en: "" }, source: "" }))}>
              Додати точку
            </button>
            {!sorted && (
              <button className="btn" onClick={() => update((d) => void d.history.points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)))}>
                Впорядкувати за датою
              </button>
            )}
          </div>
        )}
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Підсумки років</h2>
        <p className="muted">Короткий підсумок для картки року: скільки медійників загинуло за рік і одне речення про головне. Зміну показника за рік сайт рахує сам.</p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
          {yrs.map((y, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "6rem 7rem 1fr 1fr auto", gap: "0.6rem", alignItems: "end" }}>
              <Field label="Рік">
                <input className="adm-input num" type="number" min={2022} max={2100} disabled={!editable} value={y.year} onChange={(e) => update((d) => void (d.history.years[i]!.year = Number(e.target.value)))} />
              </Field>
              <Field label="Загинули за рік">
                <input className="adm-input num" type="number" min={0} disabled={!editable} value={y.killedInYear ?? ""} onChange={(e) => update((d) => void (d.history.years[i]!.killedInYear = numOrNull(e.target.value)))} />
              </Field>
              <Field label="Підсумок UA / EN">
                <div style={{ display: "grid", gap: "0.3rem" }}>
                  <input className="adm-input" maxLength={300} disabled={!editable} value={y.note.uk} onChange={(e) => update((d) => void (d.history.years[i]!.note.uk = e.target.value))} />
                  <input className="adm-input" maxLength={300} disabled={!editable} value={y.note.en} onChange={(e) => update((d) => void (d.history.years[i]!.note.en = e.target.value))} />
                </div>
              </Field>
              <Field label="Джерело">
                <input className="adm-input" type="url" disabled={!editable} value={y.source} aria-invalid={!y.source ? "true" : undefined} onChange={(e) => update((d) => void (d.history.years[i]!.source = e.target.value.trim()))} />
              </Field>
              <button className="btn" disabled={!editable} onClick={() => update((d) => void d.history.years.splice(i, 1))}>
                Видалити
              </button>
            </div>
          ))}
        </div>
        {editable && (
          <button
            className="btn"
            style={{ marginTop: "0.75rem" }}
            onClick={() => update((d) => void d.history.years.push({ year: Math.max(2021, ...d.history.years.map((x) => x.year)) + 1, killedInYear: null, note: { uk: "", en: "" }, source: "" }))}
          >
            Додати рік
          </button>
        )}
      </div>
    </div>
  );
}

export function TextsTab({ data, update, editable }: { data: SnapshotData; update: Upd; editable: boolean }) {
  const suggestion = suggestPeriodLabel(data.monitoringStart, data.asOfDate);
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Назва періоду</h2>
        <p className="muted">
          Розраховано за датами: «{suggestion.uk}» / «{suggestion.en}»{" "}
          {editable && (
            <button className="btn" style={{ marginLeft: "0.5rem" }} onClick={() => update((d) => void (d.texts.periodLabel = suggestion))}>
              Підставити
            </button>
          )}
        </p>
        <div className="adm-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "0.75rem" }}>
          <Field label="Українською">
            <input className="adm-input" disabled={!editable} maxLength={120} value={data.texts.periodLabel.uk} aria-invalid={!data.texts.periodLabel.uk ? "true" : undefined} onChange={(e) => update((d) => void (d.texts.periodLabel.uk = e.target.value))} />
          </Field>
          <Field label="English">
            <input className="adm-input" disabled={!editable} maxLength={120} value={data.texts.periodLabel.en} aria-invalid={!data.texts.periodLabel.en ? "true" : undefined} onChange={(e) => update((d) => void (d.texts.periodLabel.en = e.target.value))} />
          </Field>
        </div>
      </div>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Примітка редакції (публічна, необов&apos;язково)</h2>
        <p className="muted">Показується в блоці «Про моніторинг». Заповнюйте обидві мови або жодної. Лише текст — HTML не підтримується.</p>
        <div className="adm-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "0.75rem" }}>
          <Field label="Українською">
            <textarea className="adm-textarea" disabled={!editable} maxLength={1200} value={data.texts.editorNote.uk} onChange={(e) => update((d) => void (d.texts.editorNote.uk = e.target.value))} />
          </Field>
          <Field label="English">
            <textarea className="adm-textarea" disabled={!editable} maxLength={1200} value={data.texts.editorNote.en} onChange={(e) => update((d) => void (d.texts.editorNote.en = e.target.value))} />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function CheckTab({
  data,
  update,
  editable,
  issues,
  sum,
  total,
  status,
  dirty,
  busy,
  onSaveVerification,
  hideSave = false,
  hideInternal = false,
}: {
  data: SnapshotData;
  update: Upd;
  editable: boolean;
  issues: Issue[];
  sum: number;
  total: number;
  status: SnapshotStatus;
  dirty: boolean;
  busy: boolean;
  onSaveVerification: () => void;
  hideSave?: boolean;
  hideInternal?: boolean;
}) {
  const diff = sum - total;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  const vf = data.verification;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Сума категорій і головний показник</h2>
        <div className="adm-sum">
          <strong>{sum}</strong>
          <strong>{total}</strong>
          <strong style={{ color: diff === 0 ? "var(--color-ash)" : "var(--color-signal)" }}>{diff > 0 ? `+${diff}` : diff}</strong>
          <span>сума видимих категорій</span>
          <span>головний показник</span>
          <span>різниця</span>
        </div>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Розбіжність не виправляється автоматично. Категорії можуть перетинатися або рахуватися за іншими правилами — звірте з першоджерелом і поясніть.
        </p>
      </div>

      <div className="adm-card" style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginTop: 0 }}>Підтвердження редактора</h2>
        <label className="adm-check">
          <input type="checkbox" disabled={!editable} checked={vf.sourceChecked} onChange={(e) => update((d) => void (d.verification.sourceChecked = e.target.checked))} />
          <span>
            Я звірив(-ла) головний показник, категорії та дати з публікацією ІМІ
            {data.sources.articleUk && (
              <>
                {" "}
                (
                <a className="link" href={data.sources.articleUk} target="_blank" rel="noopener">
                  UA
                </a>
                {data.sources.articleEn && (
                  <>
                    ,{" "}
                    <a className="link" href={data.sources.articleEn} target="_blank" rel="noopener">
                      EN
                    </a>
                  </>
                )}
                )
              </>
            )}
            .
          </span>
        </label>
        {diff !== 0 && (
          <>
            <label className="adm-check">
              <input type="checkbox" disabled={!editable} checked={vf.sumMismatchConfirmed} onChange={(e) => update((d) => void (d.verification.sumMismatchConfirmed = e.target.checked))} />
              <span>
                Підтверджую: розбіжність суми категорій ({sum}) і головного показника ({total}) має методологічну причину і відповідає першоджерелу.
              </span>
            </label>
            <div className="adm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Публічне пояснення розбіжності (UA)">
                <textarea className="adm-textarea" disabled={!editable} maxLength={600} value={vf.sumMismatchExplanation.uk} onChange={(e) => update((d) => void (d.verification.sumMismatchExplanation.uk = e.target.value))} />
              </Field>
              <Field label="Public explanation (EN)">
                <textarea className="adm-textarea" disabled={!editable} maxLength={600} value={vf.sumMismatchExplanation.en} onChange={(e) => update((d) => void (d.verification.sumMismatchExplanation.en = e.target.value))} />
              </Field>
            </div>
          </>
        )}
        {!hideInternal && (
          <Field label="Внутрішня нотатка (не публікується)">
            <textarea className="adm-textarea" disabled={!editable} maxLength={2000} value={vf.internalNote} onChange={(e) => update((d) => void (d.verification.internalNote = e.target.value))} />
          </Field>
        )}
        {editable && !hideSave && (
          <div>
            <button className="btn btn--primary" disabled={busy || !dirty} onClick={onSaveVerification}>
              {status === "review" ? "Зберегти підтвердження" : "Зберегти чернетку"}
            </button>
          </div>
        )}
      </div>

      <div className="adm-card">
        <h2 style={{ marginTop: 0 }}>Результати перевірки ({sorted.filter((i) => i.severity === "error").length} помилок)</h2>
        {sorted.length === 0 && <p>Усе гаразд — можна публікувати.</p>}
        {sorted.map((i, n) => (
          <div key={n} className="adm-issue" data-sev={i.severity}>
            <b>{i.severity === "error" ? (i.kind === "gate" ? "ПІДТВЕРДИТИ" : "ПОМИЛКА") : i.severity === "warning" ? "УВАГА" : "ІНФО"}</b>
            <span>{i.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewTab({ id, data, dirty, checksum }: { id: number; data: SnapshotData; dirty: boolean; checksum: string }) {
  const [lang, setLang] = useState<"uk" | "en">("uk");
  const v = checksum.slice(0, 10);
  const slides = [...planSlides(data, "social").map((s) => ({ f: "social", s })), ...planSlides(data, "wide").map((s) => ({ f: "wide", s }))];
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {dirty && (
        <p className="adm-card" style={{ borderColor: "var(--color-ember)" }}>
          Є незбережені зміни. Попередній перегляд показує останню збережену версію.
        </p>
      )}
      <div className="chips">
        <button className="chip" aria-pressed={lang === "uk"} onClick={() => setLang("uk")}>
          Українська
        </button>
        <button className="chip" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
          English
        </button>
        <a className="btn" href={`/admin/preview/${id}/${lang}`} target="_blank" rel="noopener">
          Відкрити в новій вкладці
        </a>
      </div>
      <iframe ref={frame} key={`${lang}-${v}`} title={`Попередній перегляд (${lang})`} src={`/admin/preview/${id}/${lang}`} style={{ width: "100%", height: 760, border: "1px solid var(--color-rule)", borderRadius: 10 }} />
      <h2>PNG-експорт ({lang.toUpperCase()})</h2>
      <div className="adm-pngs">
        {slides.map(({ f, s }) => {
          const src = `/api/admin/export?id=${id}&format=${f}&lang=${lang}&slide=${s.index}&v=${v}`;
          return (
            <a key={`${f}-${s.index}`} href={src} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
              <span>
                {f === "social" ? "1080 × 1350" : "1920 × 1080"} · {s.index}/{s.count}
              </span>
            </a>
          );
        })}
        <a href={`/api/admin/export?id=${id}&format=og&lang=${lang}&v=${v}`} target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/admin/export?id=${id}&format=og&lang=${lang}&v=${v}`} alt="" loading="lazy" />
          <span>Open Graph · 1200 × 630</span>
        </a>
      </div>
    </div>
  );
}

function DiffTab({ changes, base }: { changes: ReturnType<typeof diffSnapshots>; base: Ref }) {
  if (!base) return <p className="adm-card">Немає опублікованої версії для порівняння.</p>;
  return (
    <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
      <p style={{ padding: "1rem" }} className="muted">
        Порівняння з опублікованим знімком станом на {formatLongDate(base.periodKey, "uk")} (#{base.id}).
      </p>
      <table className="adm-table">
        <thead>
          <tr>
            <th>Поле</th>
            <th>Було</th>
            <th>Стало</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.path}>
              <td>{c.label}</td>
              <td className="muted">{c.before}</td>
              <td>
                <b>{c.after}</b>
              </td>
            </tr>
          ))}
          {changes.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Змін немає.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ConfirmDialog({
  kind,
  periodKey,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: "publish" | "withdraw" | "restore" | "delete";
  periodKey: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (confirmation: string, reason: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const text = {
    publish: { title: "Опублікувати знімок?", body: "Публічний сайт, англійська версія та PNG-експорт одразу почнуть показувати ці дані. Попередня версія за цей період залишиться в історії.", cta: "Опублікувати" },
    withdraw: { title: "Зняти з публікації?", body: "Сайт покаже попередній опублікований знімок (або повідомлення про відсутність даних).", cta: "Зняти з публікації" },
    restore: { title: "Відновити цю версію?", body: "Ця версія знову стане публічною для свого періоду; поточна буде збережена в історії.", cta: "Відновити" },
    delete: { title: "Видалити чернетку?", body: "Чернетку буде видалено без можливості відновлення.", cta: "Видалити" },
  }[kind];
  const needsReason = kind === "withdraw" || kind === "restore";
  const needsConfirm = kind !== "delete";
  const ready = (!needsConfirm || confirmation === periodKey) && (!needsReason || reason.trim().length >= 5);
  return (
    <dialog ref={ref} className="adm-dialog" onCancel={onCancel} aria-labelledby="dlg-title">
      <h2 id="dlg-title" style={{ marginTop: 0 }}>
        {text.title}
      </h2>
      <p className="muted">{text.body}</p>
      {needsReason && (
        <label className="adm-field" style={{ marginTop: "1rem" }}>
          <span>Причина (буде записана в журнал)</span>
          <input className="adm-input" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      {needsConfirm && (
        <label className="adm-field" style={{ marginTop: "1rem" }}>
          <span>
            Для підтвердження введіть дату знімка: <code>{periodKey}</code>
          </span>
          <input className="adm-input" value={confirmation} onChange={(e) => setConfirmation(e.target.value.trim())} autoComplete="off" />
        </label>
      )}
      <div className="adm-actions" style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
        <button className="btn" onClick={() => (ref.current?.close(), onCancel())}>
          Скасувати
        </button>
        <button className={`btn ${kind === "publish" || kind === "restore" ? "btn--primary" : "btn--danger"}`} disabled={!ready || busy} onClick={() => onConfirm(confirmation, reason)}>
          {text.cta}
        </button>
      </div>
    </dialog>
  );
}

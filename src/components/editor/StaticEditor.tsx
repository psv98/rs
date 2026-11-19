"use client";
import { useEffect, useMemo, useState } from "react";
import { snapshotDataSchema, type SnapshotData } from "@/lib/data/schema";
import { validateSnapshot } from "@/lib/data/validation";
import { formatLongDate, suggestPeriodLabel, todayIso } from "@/lib/data/dates";
import { CategoriesTab, Field, HistoryTab, MainTab, TextsTab } from "../admin/SnapshotEditor";
import { diffSnapshots, type Change } from "@/lib/data/diff";
import type { Issue } from "@/lib/data/validation";
import { pageHref } from "@/lib/site";
import {
  REPO,
  GitHubError,
  checkAccess,
  deployState,
  forgetVault,
  hasVault,
  openVault,
  readDataFile,
  saveVault,
  vaultLogin,
  writeDataFile,
  type RunState,
} from "./github";

type Entry = { revision: number; publishedAt: string | null; data: SnapshotData };
type FileJson = { format: string; version: number; snapshots: Entry[] };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const byDate = (a: Entry, b: Entry) => (a.data.asOfDate < b.data.asOfDate ? -1 : 1);

/**
 * Editor for the GitHub Pages site. The data lives in data/published/snapshots.json in the
 * repository; publishing = one commit, after which GitHub Actions rebuilds the site and
 * all PNG files. Access = a GitHub token with write access to psv98/rs, kept on this
 * device encrypted with the editor password.
 */
export function StaticEditor() {
  const [token, setToken] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  if (!token) return <Gate onReady={(t, l) => (setToken(t), setLogin(l))} />;
  return (
    <Workspace
      token={token}
      login={login ?? "GitHub"}
      onLogout={() => {
        setToken(null);
        setLogin(null);
      }}
    />
  );
}

/* --------------------------------------------------------------------- sign-in */

function Gate({ onReady }: { onReady: (token: string, login: string) => void }) {
  const [mode, setMode] = useState<"password" | "setup" | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setMode(hasVault() ? "password" : "setup"), []);

  const unlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await openVault(password);
      const l = await checkAccess(t);
      onReady(t, l);
    } catch (e) {
      setError(e instanceof GitHubError && e.status === 401 ? "Токен більше не дійсний (прострочений або відкликаний). Налаштуйте вхід заново." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const setup = async () => {
    setError(null);
    if (password.length < 10) return setError("Пароль має бути щонайменше 10 символів.");
    if (password !== password2) return setError("Паролі не збігаються.");
    setBusy(true);
    try {
      const t = tokenInput.trim();
      const l = await checkAccess(t);
      await saveVault(t, password, l);
      onReady(t, l);
    } catch (e) {
      setError(e instanceof GitHubError && e.status === 401 ? "GitHub не прийняв токен. Перевірте, що скопіювали його повністю." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!mode) return null;
  return (
    <div className="adm-login">
      <div className="adm-card" style={{ width: "min(36rem, 100%)", display: "grid", gap: "1rem" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>Редактор даних</h1>
        {mode === "password" ? (
          <>
            <p className="muted">Вхід на цьому пристрої{vaultLogin() ? ` як ${vaultLogin()}` : ""}.</p>
            <Field label="Пароль редактора">
              <input className="adm-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} autoFocus />
            </Field>
            <button className="btn btn--primary" disabled={busy || !password} onClick={unlock}>
              {busy ? "Перевіряю…" : "Увійти"}
            </button>
            <button
              className="btn"
              onClick={() => {
                forgetVault();
                setMode("setup");
                setPassword("");
              }}
            >
              Налаштувати вхід заново
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Перший вхід на цьому пристрої. Потрібен GitHub-токен з правом запису лише в репозиторій {REPO.owner}/{REPO.repo}. Токен зберігається тільки на цьому пристрої,
              зашифрований вашим паролем.
            </p>
            <ol style={{ display: "grid", gap: "0.45rem", paddingLeft: "1.2rem", listStyle: "decimal", color: "var(--color-ash)", fontSize: "0.92rem" }}>
              <li>
                Відкрийте{" "}
                <a className="link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">
                  github.com → Fine-grained token
                </a>
                .
              </li>
              <li>Repository access: Only select repositories → {REPO.owner}/{REPO.repo}.</li>
              <li>Permissions → Repository → Contents: Read and write. Інше не потрібно (Actions: Read можна додати, щоб бачити статус публікації).</li>
              <li>Термін дії: 90 днів. Створіть токен і вставте його нижче.</li>
            </ol>
            <Field label="GitHub-токен">
              <input className="adm-input" type="password" autoComplete="off" spellCheck={false} value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="github_pat_…" />
            </Field>
            <div className="adm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Новий пароль редактора" hint="Щонайменше 10 символів">
                <input className="adm-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Повторіть пароль">
                <input className="adm-input" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
              </Field>
            </div>
            <button className="btn btn--primary" disabled={busy || !tokenInput || !password} onClick={setup}>
              {busy ? "Перевіряю доступ…" : "Зберегти й увійти"}
            </button>
          </>
        )}
        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- workspace */

const STEPS: Array<{ id: Step; title: string; help: string }> = [
  {
    id: "main",
    title: "Головні цифри",
    help: "Загальна кількість злочинів, дата, на яку актуальні дані, нові випадки за останній період і кількість загиблих медійників. Числа беріть з публікації ІМІ.",
  },
  {
    id: "categories",
    title: "Види порушень",
    help: "14 видів порушень з кругової діаграми та карток. Змініть число біля потрібного виду. Назви та іконки зазвичай не змінюються.",
  },
  {
    id: "history",
    title: "Динаміка по роках",
    help: "Точки графіка «Як змінювалися цифри» і картки років. До кожної точки потрібне посилання на публікацію на imi.org.ua. Поточні дані додаються на графік автоматично.",
  },
  {
    id: "texts",
    title: "Тексти UA/EN",
    help: "Підпис періоду («4 роки і 8 місяців повномасштабної війни»), примітка редакції та посилання на публікації ІМІ українською й англійською.",
  },
];
type Step = "main" | "categories" | "history" | "texts";
const stepOf = (field?: string): Step =>
  !field ? "main" : field.startsWith("categories") ? "categories" : field.startsWith("history") ? "history" : field.startsWith("texts") || field.startsWith("sources") ? "texts" : "main";

function Workspace({ token, login, onLogout }: { token: string; login: string; onLogout: () => void }) {
  const [file, setFile] = useState<FileJson | null>(null);
  const [sha, setSha] = useState("");
  const [mode, setMode] = useState<"edit" | "new">("edit");
  const [base, setBase] = useState<SnapshotData | null>(null); // what the edit started from
  const [data, setData] = useState<SnapshotData | null>(null);
  const [step, setStep] = useState<Step>("main");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [done, setDone] = useState<{ commit: string; state: RunState; asOf: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const entries = useMemo(() => (file ? [...file.snapshots].sort(byDate) : []), [file]);
  const live = entries.at(-1)?.data ?? null;

  const load = async () => {
    setBusy(true);
    setLoadError(null);
    try {
      const r = await readDataFile(token);
      const f = r.json as FileJson;
      f.snapshots = f.snapshots.map((x) => ({ ...x, data: snapshotDataSchema.parse(x.data) }));
      setFile(f);
      setSha(r.sha);
      const latest = [...f.snapshots].sort(byDate).at(-1)!.data;
      setMode("edit");
      setBase(clone(latest));
      setData(clone(latest));
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changes = useMemo(() => (data && base ? diffSnapshots(base, data).filter((c) => !c.path.startsWith("verification")) : []), [data, base]);
  const dirty = mode === "new" || changes.length > 0;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!done || (done.state && done.state.status === "completed")) return;
    const t = setInterval(async () => {
      try {
        const st = await deployState(token, done.commit);
        setDone((r) => (r ? { ...r, state: st } : r));
      } catch {
        clearInterval(t);
      }
    }, 8000);
    return () => clearInterval(t);
  }, [done, token]);

  const previous = useMemo(() => {
    if (!data) return null;
    const before = entries.filter((e) => e.data.asOfDate < data.asOfDate);
    return before.length ? before[before.length - 1]!.data : null;
  }, [entries, data]);
  const v = useMemo(() => (data ? validateSnapshot(data, { previous, today: todayIso() }) : null), [data, previous]);
  const dataErrors = v ? v.issues.filter((i) => i.severity === "error" && i.kind !== "gate") : [];
  const warnings = v ? v.issues.filter((i) => i.severity === "warning") : [];

  // Any change to figures or texts withdraws the confirmations: they are given again in
  // the review step for exactly what is about to be published.
  const update = (fn: (d: SnapshotData) => void) =>
    setData((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      fn(next);
      const strip = (d: SnapshotData) => JSON.stringify({ ...d, verification: null });
      if (strip(next) !== strip(prev)) {
        next.verification.sourceChecked = false;
        next.verification.sumMismatchConfirmed = false;
      }
      return next;
    });

  const startEdit = () => {
    if (!live || (dirty && !window.confirm("Незбережені зміни буде втрачено. Продовжити?"))) return;
    setMode("edit");
    setBase(clone(live));
    setData(clone(live));
    setStep("main");
  };
  const startNew = (asOf = todayIso()) => {
    if (!live) return;
    if (mode !== "new" && dirty && !window.confirm("Незбережені зміни буде втрачено. Продовжити?")) return;
    const d = clone(live);
    d.asOfDate = asOf;
    d.period = { start: live.asOfDate, end: asOf, newCases: null };
    d.texts.periodLabel = suggestPeriodLabel(d.monitoringStart, asOf);
    d.verification = { ...d.verification, sourceChecked: false, sumMismatchConfirmed: false, internalNote: "" };
    // The figures that are on the site now become a point on the dynamics chart.
    if (!d.history.points.some((p) => p.date === live.asOfDate)) {
      d.history.points.push({
        date: live.asOfDate,
        total: live.totalCrimes,
        killedTotal: live.casualties.killedTotal,
        killedOnDuty: live.casualties.killedOnDuty,
        note: { uk: "", en: "" },
        source: live.sources.articleUk,
      });
      d.history.points.sort((a, b) => (a.date < b.date ? -1 : 1));
    }
    setMode("new");
    setBase(clone(live));
    setData(d);
    setStep("main");
  };

  const publish = async () => {
    if (!file || !data) return;
    setBusy(true);
    setPublishError(null);
    try {
      const now = new Date().toISOString();
      const next: FileJson = clone(file);
      // The repository is public: internal notes are not written to it.
      const out: SnapshotData = { ...clone(data), verification: { ...data.verification, internalNote: "" } };
      const at = next.snapshots.findIndex((x) => x.data.asOfDate === (mode === "edit" ? base!.asOfDate : out.asOfDate));
      if (at >= 0) next.snapshots[at] = { revision: next.snapshots[at]!.revision + 1, publishedAt: now, data: out };
      else next.snapshots.push({ revision: 1, publishedAt: now, data: out });
      next.snapshots.sort(byDate);
      const what = mode === "new" ? "нові дані" : "виправлення";
      const r = await writeDataFile(token, next, sha, `Дані станом на ${out.asOfDate}: ${what} (редактор, ${login})`);
      setSha(r.sha);
      setFile(next);
      setMode("edit");
      setBase(clone(out));
      setData(clone(out));
      setReview(false);
      setDone({ commit: r.commit, state: null, asOf: out.asOfDate });
    } catch (e) {
      const err = e as GitHubError;
      setPublishError(
        err.status === 409 ? "Хтось інший щойно змінив дані. Закрийте це вікно, натисніть «Завантажити заново» і внесіть зміни ще раз." : err.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const site = pageHref("uk");
  const help = STEPS.find((x) => x.id === step)!;
  return (
    <div className="adm ed">
      <header className="ed-top">
        <div className="ed-top__inner">
          <b className="ed-top__title">Редактор даних</b>
          {live && (
            <span className="ed-live">
              На сайті зараз: <b>{live.totalCrimes}</b> станом на {formatLongDate(live.asOfDate, "uk")}
            </span>
          )}
          <nav className="ed-top__links">
            <a href={site} target="_blank" rel="noopener">
              Сайт
            </a>
            <a href={`https://github.com/${REPO.owner}/${REPO.repo}/commits/${REPO.branch}/${REPO.file}`} target="_blank" rel="noopener">
              Журнал змін
            </a>
            <button onClick={onLogout}>Вийти ({login})</button>
          </nav>
        </div>
      </header>

      <main className="ed-main">
        {!file || !data || !live ? (
          <div className="adm-card">
            {busy ? "Завантажую дані з GitHub…" : loadError}
            {loadError && (
              <button className="btn" style={{ marginLeft: "1rem" }} onClick={load}>
                <span>Спробувати ще раз</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {done && (
              <div className="ed-done" role="status">
                <b>Опубліковано: дані станом на {formatLongDate(done.asOf, "uk")}.</b>
                <span>
                  {!done.state || done.state.status !== "completed"
                    ? "Сайт і інфографіка оновлюються, це займає близько 2 хвилин."
                    : done.state.conclusion === "success"
                      ? "Сайт оновлено. Якщо бачите старі цифри, оновіть сторінку."
                      : "Під час оновлення сайту сталася помилка."}{" "}
                  {done.state?.url && (
                    <a className="link" href={done.state.url} target="_blank" rel="noopener">
                      Подробиці
                    </a>
                  )}
                </span>
              </div>
            )}

            <section className="ed-mode" aria-label="Що ви хочете зробити">
              <button className="ed-choice" aria-pressed={mode === "edit"} onClick={startEdit}>
                <b>Виправити поточні дані</b>
                <span>
                  Уточнити цифри станом на {formatLongDate(live.asOfDate, "uk")}. Підходить для виправлень у будь-який день.
                </span>
              </button>
              <div className="ed-choice" aria-pressed={mode === "new"} role="group">
                <button className="ed-choice__btn" onClick={() => startNew(data.asOfDate > live.asOfDate ? data.asOfDate : todayIso())}>
                  <b>Додати нові дані</b>
                  <span>Нові цифри на обрану дату. Поточні стануть точкою на графіку динаміки.</span>
                </button>
                {mode === "new" && (
                  <label className="ed-date">
                    Дані станом на
                    <input
                      className="adm-input"
                      type="date"
                      value={data.asOfDate}
                      min={live.asOfDate}
                      max={todayIso()}
                      onChange={(e) => e.target.value && startNew(e.target.value)}
                    />
                  </label>
                )}
              </div>
            </section>

            <nav className="ed-steps" aria-label="Розділи">
              {STEPS.map((x, i) => {
                const n = v?.issues.filter((iss) => iss.severity === "error" && iss.kind !== "gate" && stepOf(iss.field) === x.id).length ?? 0;
                return (
                  <button key={x.id} aria-current={step === x.id ? "step" : undefined} onClick={() => setStep(x.id)}>
                    <i>{i + 1}</i>
                    <span>{x.title}</span>
                    {n > 0 && <em title="Помилки в розділі">{n}</em>}
                  </button>
                );
              })}
            </nav>
            <p className="ed-help">{help.help}</p>

            <div className="ed-panel">
              {step === "main" && <MainTab data={data} update={update} editable changeNote="" setChangeNote={() => undefined} issues={v?.issues ?? []} hideChangeNote />}
              {step === "categories" && <CategoriesTab data={data} update={update} editable />}
              {step === "history" && <HistoryTab data={data} update={update} editable />}
              {step === "texts" && <TextsTab data={data} update={update} editable />}
            </div>
          </>
        )}
      </main>

      {data && live && (
        <footer className="ed-bar">
          <div className="ed-bar__inner">
            <span className="ed-bar__state">
              {mode === "new" ? `Нові дані станом на ${formatLongDate(data.asOfDate, "uk")}` : changes.length ? `Змінено полів: ${changes.length}` : "Змін поки немає"}
              {warnings.length > 0 && <em className="ed-chip ed-chip--warn">Попереджень: {warnings.length}</em>}
              {dataErrors.length > 0 && <em className="ed-chip ed-chip--err">Помилок: {dataErrors.length}</em>}
            </span>
            {dirty && (
              <button className="btn" onClick={startEdit}>
                <span>Скасувати зміни</span>
              </button>
            )}
            <button className="btn btn--primary btn--lg" disabled={!dirty || busy} onClick={() => (setPublishError(null), setReview(true))}>
              <span>{dirty ? "Перевірити й опублікувати" : "Немає що публікувати"}</span>
            </button>
          </div>
        </footer>
      )}

      {review && data && v && (
        <ReviewDialog
          data={data}
          update={update}
          changes={changes}
          isNew={mode === "new"}
          dataErrors={dataErrors}
          warnings={warnings}
          sum={v.categorySum}
          busy={busy}
          error={publishError}
          onGo={(f) => (setReview(false), setStep(stepOf(f)))}
          onClose={() => setReview(false)}
          onPublish={publish}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- review */

function ReviewDialog({
  data,
  update,
  changes,
  isNew,
  dataErrors,
  warnings,
  sum,
  busy,
  error,
  onGo,
  onClose,
  onPublish,
}: {
  data: SnapshotData;
  update: (fn: (d: SnapshotData) => void) => void;
  changes: Change[];
  isNew: boolean;
  dataErrors: Issue[];
  warnings: Issue[];
  sum: number;
  busy: boolean;
  error: string | null;
  onGo: (field?: string) => void;
  onClose: () => void;
  onPublish: () => void;
}) {
  const vf = data.verification;
  const mismatch = sum !== data.totalCrimes;
  const explained = !!vf.sumMismatchExplanation.uk && !!vf.sumMismatchExplanation.en;
  const ready = dataErrors.length === 0 && vf.sourceChecked && (!mismatch || (vf.sumMismatchConfirmed && explained));
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="ed-modal" role="dialog" aria-modal="true" aria-labelledby="ed-review-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ed-modal__box">
        <h2 id="ed-review-title">Перевірка перед публікацією</h2>

        <section>
          <h3>{isNew ? `Нові дані станом на ${formatLongDate(data.asOfDate, "uk")}` : "Що зміниться на сайті"}</h3>
          {changes.length === 0 ? (
            <p className="muted">Цифри ті самі, що й зараз на сайті.</p>
          ) : (
            <ul className="ed-changes">
              {changes.slice(0, 40).map((c) => (
                <li key={c.path}>
                  <span>{c.label}</span>
                  <s>{c.before}</s>
                  <b>{c.after}</b>
                </li>
              ))}
              {changes.length > 40 && <li className="muted">і ще {changes.length - 40}</li>}
            </ul>
          )}
        </section>

        {dataErrors.length > 0 && (
          <section className="ed-issues ed-issues--err">
            <h3>Потрібно виправити перед публікацією</h3>
            <ul>
              {dataErrors.map((i, n) => (
                <li key={n}>
                  {i.message}{" "}
                  <button className="link" onClick={() => onGo(i.field)}>
                    Виправити
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <section className="ed-issues ed-issues--warn">
            <h3>Зверніть увагу</h3>
            <p className="muted">Це попередження. Якщо так і має бути, публікуйте.</p>
            <ul>
              {warnings.map((i, n) => (
                <li key={n}>{i.message}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="ed-confirm">
          <h3>Підтвердження</h3>
          <label className="ed-check">
            <input type="checkbox" checked={vf.sourceChecked} onChange={(e) => update((d) => void (d.verification.sourceChecked = e.target.checked))} />
            <span>Я звірив(-ла) цифри з публікацією ІМІ.</span>
          </label>
          {mismatch && (
            <>
              <label className="ed-check">
                <input type="checkbox" checked={vf.sumMismatchConfirmed} onChange={(e) => update((d) => void (d.verification.sumMismatchConfirmed = e.target.checked))} />
                <span>
                  Сума видів порушень ({sum}) відрізняється від головного показника ({data.totalCrimes}). Я перевірив(-ла): так у публікації ІМІ.
                </span>
              </label>
              {vf.sumMismatchConfirmed && (
                <div className="ed-explain">
                  <Field label="Пояснення для сайту (UA)" hint="Показується в розділі «Про дані»">
                    <textarea
                      className="adm-textarea"
                      maxLength={600}
                      value={vf.sumMismatchExplanation.uk}
                      onChange={(e) => update((d) => void (d.verification.sumMismatchExplanation.uk = e.target.value))}
                    />
                  </Field>
                  <Field label="Пояснення для сайту (EN)">
                    <textarea
                      className="adm-textarea"
                      maxLength={600}
                      value={vf.sumMismatchExplanation.en}
                      onChange={(e) => update((d) => void (d.verification.sumMismatchExplanation.en = e.target.value))}
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </section>

        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}

        <div className="ed-modal__actions">
          <button className="btn" onClick={onClose}>
            <span>Повернутися до редагування</span>
          </button>
          <button className="btn btn--primary btn--lg" disabled={!ready || busy} onClick={onPublish}>
            <span>{busy ? "Публікую…" : "Опублікувати на сайті"}</span>
          </button>
        </div>
        {!ready && !busy && (
          <p className="muted ed-why">
            {dataErrors.length > 0
              ? "Спершу виправте помилки вище."
              : !vf.sourceChecked
                ? "Поставте позначку, що цифри звірено з публікацією ІМІ."
                : "Підтвердьте розбіжність суми і додайте пояснення обома мовами."}
          </p>
        )}
      </div>
    </div>
  );
}

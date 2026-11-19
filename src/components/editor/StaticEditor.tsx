"use client";
import { useEffect, useMemo, useState } from "react";
import { snapshotDataSchema, type SnapshotData } from "@/lib/data/schema";
import { validateSnapshot } from "@/lib/data/validation";
import { formatLongDate, suggestPeriodLabel, todayIso } from "@/lib/data/dates";
import { CategoriesTab, CheckTab, Field, HistoryTab, MainTab, TextsTab } from "../admin/SnapshotEditor";
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
type Tab = "main" | "categories" | "history" | "texts" | "check";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const byDate = (a: Entry, b: Entry) => (a.data.asOfDate < b.data.asOfDate ? -1 : 1);
const addMonth = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m, d));
  return dt.toISOString().slice(0, 10);
};

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

function Workspace({ token, login, onLogout }: { token: string; login: string; onLogout: () => void }) {
  const [file, setFile] = useState<FileJson | null>(null);
  const [sha, setSha] = useState("");
  const [index, setIndex] = useState(-1); // index in the sorted list; -1 = new month draft
  const [data, setData] = useState<SnapshotData | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("main");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [run, setRun] = useState<{ commit: string; state: RunState } | null>(null);

  const entries = useMemo(() => (file ? [...file.snapshots].sort(byDate) : []), [file]);

  const load = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await readDataFile(token);
      const f = r.json as FileJson;
      f.snapshots = f.snapshots.map((s) => ({ ...s, data: snapshotDataSchema.parse(s.data) }));
      setFile(f);
      setSha(r.sha);
      const sorted = [...f.snapshots].sort(byDate);
      setIndex(sorted.length - 1);
      setData(clone(sorted[sorted.length - 1]!.data));
      setIsNew(false);
      setDirty(false);
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Follow the deploy run after publishing.
  useEffect(() => {
    if (!run || (run.state && run.state.status === "completed")) return;
    const t = setInterval(async () => {
      try {
        const s = await deployState(token, run.commit);
        setRun((r) => (r ? { ...r, state: s } : r));
      } catch {
        /* Actions permission may be missing: just stop polling */
        clearInterval(t);
      }
    }, 8000);
    return () => clearInterval(t);
  }, [run, token]);

  const previous = useMemo(() => {
    if (!data) return null;
    const before = entries.filter((e) => e.data.asOfDate < data.asOfDate);
    return before.length ? before[before.length - 1]!.data : null;
  }, [entries, data]);
  const v = useMemo(() => (data ? validateSnapshot(data, { previous, today: todayIso() }) : null), [data, previous]);
  const errors = v ? v.issues.filter((i) => i.severity === "error") : [];

  // Any change to the figures or texts withdraws the editor's confirmations: they must be
  // given again for exactly what is about to be published.
  const update = (fn: (d: SnapshotData) => void) => {
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
    setDirty(true);
  };

  const pick = (i: number) => {
    if (dirty && !window.confirm("Є незбережені зміни. Відкинути їх?")) return;
    setIndex(i);
    setData(clone(entries[i]!.data));
    setIsNew(false);
    setDirty(false);
    setTab("main");
  };

  const newMonth = () => {
    if (dirty && !window.confirm("Є незбережені зміни. Відкинути їх?")) return;
    const last = entries[entries.length - 1]!.data;
    const d = clone(last);
    const asOf = addMonth(last.asOfDate);
    d.asOfDate = asOf;
    d.period = { start: last.asOfDate, end: asOf, newCases: null };
    d.texts.periodLabel = suggestPeriodLabel(d.monitoringStart, asOf);
    d.verification = { ...d.verification, sourceChecked: false, sumMismatchConfirmed: false, internalNote: "" };
    // The previous month becomes a point on the dynamics chart.
    if (!d.history.points.some((p) => p.date === last.asOfDate)) {
      d.history.points.push({
        date: last.asOfDate,
        total: last.totalCrimes,
        killedTotal: last.casualties.killedTotal,
        killedOnDuty: last.casualties.killedOnDuty,
        note: { uk: "", en: "" },
        source: last.sources.articleUk,
      });
    }
    setData(d);
    setIndex(-1);
    setIsNew(true);
    setDirty(true);
    setTab("main");
  };

  const publish = async () => {
    if (!file || !data || errors.length) return;
    if (!window.confirm(`Опублікувати дані станом на ${formatLongDate(data.asOfDate, "uk")}? Сайт і всі PNG оновляться приблизно за 2 хвилини.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const now = new Date().toISOString();
      const next: FileJson = clone(file);
      // The repository is public: internal notes are not written to it.
      const out: SnapshotData = { ...clone(data), verification: { ...data.verification, internalNote: "" } };
      if (isNew) {
        next.snapshots.push({ revision: 1, publishedAt: now, data: out });
      } else {
        const orig = entries[index]!;
        const at = next.snapshots.findIndex((s) => s.data.asOfDate === orig.data.asOfDate);
        next.snapshots[at] = { revision: orig.revision + 1, publishedAt: now, data: out };
      }
      next.snapshots.sort(byDate);
      const r = await writeDataFile(token, next, sha, `Дані станом на ${data.asOfDate}: ${isNew ? "новий місяць" : "оновлення"} (редактор, ${login})`);
      setSha(r.sha);
      setFile(next);
      const sorted = [...next.snapshots].sort(byDate);
      setIndex(sorted.findIndex((s) => s.data.asOfDate === data.asOfDate));
      setIsNew(false);
      setDirty(false);
      setRun({ commit: r.commit, state: null });
      setMsg({ kind: "ok", text: "Збережено в репозиторії. Сайт і інфографіка оновлюються." });
    } catch (e) {
      const err = e as GitHubError;
      setMsg({
        kind: "error",
        text: err.status === 409 ? "Файл даних змінився з іншого місця. Натисніть «Оновити з GitHub» і повторіть зміни." : err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const site = pageHref("uk");
  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-bar">
          <b>Редактор даних</b>
          <span className="muted">{login}</span>
          <a className="btn" href={site} target="_blank" rel="noopener">
            Відкрити сайт
          </a>
          <a className="btn" href={`https://github.com/${REPO.owner}/${REPO.repo}/commits/${REPO.branch}/${REPO.file}`} target="_blank" rel="noopener">
            Журнал змін
          </a>
          <button className="btn" onClick={onLogout}>
            Вийти
          </button>
        </div>
      </header>
      <main className="adm-main">
        {!file || !data ? (
          <p className="adm-card">{busy ? "Завантажую дані з GitHub…" : msg?.text}</p>
        ) : (
          <>
            <div className="adm-card" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
              <Field label="Знімок">
                <select className="adm-select" value={isNew ? "new" : String(index)} onChange={(e) => e.target.value !== "new" && pick(Number(e.target.value))}>
                  {entries.map((e, i) => (
                    <option key={e.data.asOfDate} value={i}>
                      {`${formatLongDate(e.data.asOfDate, "uk")}: ${e.data.totalCrimes}${i === entries.length - 1 ? " (на сайті зараз)" : ""}`}
                    </option>
                  ))}
                  {isNew && <option value="new">{`Новий: ${formatLongDate(data.asOfDate, "uk")}`}</option>}
                </select>
              </Field>
              <button className="btn" onClick={newMonth} disabled={busy}>
                Новий місяць
              </button>
              <button className="btn" onClick={() => (!dirty || window.confirm("Відкинути незбережені зміни?")) && load()} disabled={busy}>
                Оновити з GitHub
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {dirty && <span className="muted">Є незбережені зміни</span>}
                <button className="btn btn--primary" onClick={publish} disabled={busy || !dirty || errors.length > 0} title={errors.length ? "Спершу виправте помилки на вкладці «Перевірка»" : undefined}>
                  {busy ? "Публікую…" : "Опублікувати"}
                </button>
              </div>
            </div>

            {msg && (
              <div className="adm-card" role={msg.kind === "error" ? "alert" : "status"} style={{ borderColor: msg.kind === "error" ? "var(--color-signal)" : undefined, marginTop: "1rem" }}>
                <b>{msg.text}</b>
                {run && (
                  <p className="muted" style={{ marginTop: "0.4rem" }}>
                    {!run.state
                      ? "Чекаю, поки GitHub запустить публікацію…"
                      : run.state.status !== "completed"
                        ? "Публікація триває…"
                        : run.state.conclusion === "success"
                          ? "Готово: сайт оновлено (може знадобитися ще хвилина на кеш)."
                          : "Публікація завершилась з помилкою."}{" "}
                    {run.state?.url && (
                      <a className="link" href={run.state.url} target="_blank" rel="noopener">
                        Деталі
                      </a>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="adm-tabs" role="tablist" style={{ marginTop: "1rem" }}>
              {(
                [
                  ["main", "Основне"],
                  ["categories", `Категорії (${data.categories.length})`],
                  ["history", `Динаміка (${data.history.points.length})`],
                  ["texts", "Тексти UA/EN"],
                  ["check", "Перевірка"],
                ] as Array<[Tab, string]>
              ).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                  {l}
                  {k === "check" && errors.length > 0 && <span className="count">{errors.length}</span>}
                </button>
              ))}
            </div>
            {tab === "main" && <MainTab data={data} update={update} editable changeNote="" setChangeNote={() => undefined} issues={v?.issues ?? []} hideChangeNote />}
            {tab === "categories" && <CategoriesTab data={data} update={update} editable />}
            {tab === "history" && <HistoryTab data={data} update={update} editable />}
            {tab === "texts" && <TextsTab data={data} update={update} editable />}
            {tab === "check" && v && (
              <CheckTab data={data} update={update} editable issues={v.issues} sum={v.categorySum} total={data.totalCrimes} status="draft" dirty={dirty} busy={busy} onSaveVerification={() => undefined} hideSave hideInternal />
            )}
          </>
        )}
      </main>
    </div>
  );
}

import type { SnapshotData } from "./schema";

export interface Change {
  path: string;
  label: string;
  before: string;
  after: string;
}

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "так" : "ні";
  return String(v);
};

const FIELDS: Array<[string, string, (d: SnapshotData) => unknown]> = [
  ["totalCrimes", "Головний показник", (d) => d.totalCrimes],
  ["asOfDate", "Станом на", (d) => d.asOfDate],
  ["monitoringStart", "Початок моніторингу", (d) => d.monitoringStart],
  ["period.start", "Звітний період: початок", (d) => d.period.start],
  ["period.end", "Звітний період: кінець", (d) => d.period.end],
  ["period.newCases", "Нові випадки за період", (d) => d.period.newCases],
  ["casualties.killedTotal", "Загиблі медійники", (d) => d.casualties.killedTotal],
  ["casualties.killedOnDuty", "З них під час роботи", (d) => d.casualties.killedOnDuty],
  ["texts.periodLabel.uk", "Назва періоду (UK)", (d) => d.texts.periodLabel.uk],
  ["texts.periodLabel.en", "Назва періоду (EN)", (d) => d.texts.periodLabel.en],
  ["texts.editorNote.uk", "Примітка редакції (UK)", (d) => d.texts.editorNote.uk],
  ["texts.editorNote.en", "Примітка редакції (EN)", (d) => d.texts.editorNote.en],
  ["sources.articleUk", "Публікація ІМІ (UK)", (d) => d.sources.articleUk],
  ["sources.articleEn", "Публікація ІМІ (EN)", (d) => d.sources.articleEn],
  ["sources.registry", "Реєстр ІМІ", (d) => d.sources.registry],
  ["verification.sumMismatchExplanation.uk", "Пояснення розбіжності (UK)", (d) => d.verification.sumMismatchExplanation.uk],
  ["verification.sumMismatchExplanation.en", "Пояснення розбіжності (EN)", (d) => d.verification.sumMismatchExplanation.en],
];

/** Human-readable field-level diff between two snapshot documents. */
export function diffSnapshots(before: SnapshotData | null, after: SnapshotData): Change[] {
  const changes: Change[] = [];
  if (!before) return changes;
  for (const [path, label, get] of FIELDS) {
    const a = show(get(before));
    const b = show(get(after));
    if (a !== b) changes.push({ path, label, before: a, after: b });
  }
  const hp = (d: SnapshotData) => d.history.points.map((p) => `${p.date}:${p.total ?? "—"}`).join(", ");
  if (hp(before) !== hp(after))
    changes.push({ path: "history.points", label: "Динаміка: точки", before: `${before.history.points.length} точок`, after: `${after.history.points.length} точок` });
  if (JSON.stringify(before.history.years) !== JSON.stringify(after.history.years))
    changes.push({ path: "history.years", label: "Динаміка: описи років", before: `${before.history.years.length}`, after: `${after.history.years.length}` });
  const ids = new Set([...before.categories.map((c) => c.id), ...after.categories.map((c) => c.id)]);
  for (const id of ids) {
    const a = before.categories.find((c) => c.id === id);
    const b = after.categories.find((c) => c.id === id);
    const name = b?.name.uk || a?.name.uk || id;
    if (!a) {
      changes.push({ path: `categories.${id}`, label: `Нова категорія «${name}»`, before: "—", after: show(b?.value) });
      continue;
    }
    if (!b) {
      changes.push({ path: `categories.${id}`, label: `Видалено категорію «${name}»`, before: show(a.value), after: "—" });
      continue;
    }
    if (a.value !== b.value) changes.push({ path: `categories.${id}.value`, label: `«${name}»: значення`, before: show(a.value), after: show(b.value) });
    if (a.hidden !== b.hidden) changes.push({ path: `categories.${id}.hidden`, label: `«${name}»: прихована`, before: show(a.hidden), after: show(b.hidden) });
    if (a.order !== b.order) changes.push({ path: `categories.${id}.order`, label: `«${name}»: порядок`, before: show(a.order), after: show(b.order) });
    for (const l of ["uk", "en"] as const) {
      if (a.name[l] !== b.name[l]) changes.push({ path: `categories.${id}.name.${l}`, label: `«${name}»: назва (${l.toUpperCase()})`, before: show(a.name[l]), after: show(b.name[l]) });
      if (a.description[l] !== b.description[l])
        changes.push({ path: `categories.${id}.description.${l}`, label: `«${name}»: пояснення (${l.toUpperCase()})`, before: show(a.description[l]), after: show(b.description[l]) });
    }
    if (a.iconId !== b.iconId) changes.push({ path: `categories.${id}.iconId`, label: `«${name}»: іконка`, before: a.iconId, after: b.iconId });
  }
  return changes;
}

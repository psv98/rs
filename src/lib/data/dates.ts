import type { Locale } from "./schema";

const UK_MONTHS_GEN = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  return { y, m, d };
}

/** "24 жовтня 2026 року" / "24 October 2026" */
export function formatLongDate(iso: string, locale: Locale, withYearWord = true): string {
  const { y, m, d } = parts(iso);
  if (locale === "uk") return `${d} ${UK_MONTHS_GEN[m - 1]} ${y}${withYearWord ? " року" : ""}`;
  return `${d} ${EN_MONTHS[m - 1]} ${y}`;
}

/** "24.10.2026" */
export function formatShortDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

/** "24 вер. – 24 жовт. 2026" style compact range without abbreviations ambiguity. */
export function formatRange(start: string, end: string, locale: Locale): string {
  const a = parts(start);
  const b = parts(end);
  if (locale === "uk") {
    const left = `${a.d} ${UK_MONTHS_GEN[a.m - 1]}${a.y !== b.y ? ` ${a.y}` : ""}`;
    return `${left} — ${b.d} ${UK_MONTHS_GEN[b.m - 1]} ${b.y}`;
  }
  const left = `${a.d} ${EN_MONTHS[a.m - 1]}${a.y !== b.y ? ` ${a.y}` : ""}`;
  return `${left} — ${b.d} ${EN_MONTHS[b.m - 1]} ${b.y}`;
}

export function formatDateTime(isoTs: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(new Date(isoTs));
}

export function yearOf(iso: string): number {
  return Number.parseInt(iso.slice(0, 4), 10);
}

/** Whole months between two ISO dates (day-of-month aware). */
export function monthsBetween(start: string, end: string): number {
  const a = parts(start);
  const b = parts(end);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months -= 1;
  return Math.max(0, months);
}

const ukPlural = new Intl.PluralRules("uk");
export function ukForm(n: number, forms: { one: string; few: string; many: string }): string {
  const r = ukPlural.select(n);
  return r === "one" ? forms.one : r === "few" ? forms.few : forms.many;
}

/** Suggested war-duration label: "4 роки і 8 місяців повномасштабної війни" / "4 years, 8 months of the full-scale war". */
export function suggestPeriodLabel(monitoringStart: string, asOfDate: string): { uk: string; en: string } {
  const total = monthsBetween(monitoringStart, asOfDate);
  const y = Math.floor(total / 12);
  const m = total % 12;
  const ukY = y > 0 ? `${y} ${ukForm(y, { one: "рік", few: "роки", many: "років" })}` : "";
  const ukM = m > 0 ? `${m} ${ukForm(m, { one: "місяць", few: "місяці", many: "місяців" })}` : "";
  const enY = y > 0 ? `${y} ${y === 1 ? "year" : "years"}` : "";
  const enM = m > 0 ? `${m} ${m === 1 ? "month" : "months"}` : "";
  return {
    uk: `${[ukY, ukM].filter(Boolean).join(" і ")} повномасштабної війни`,
    en: `${[enY, enM].filter(Boolean).join(", ")} of the full-scale war`,
  };
}

export function todayIso(): string {
  // Calendar date in Kyiv — publication dates are Ukrainian dates.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date());
}

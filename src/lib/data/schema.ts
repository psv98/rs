import { z } from "zod";
import { CATEGORY_ICON_IDS } from "../icons/category-icons.generated";

/**
 * The snapshot document: everything the public site and the PNG exports show is
 * derived from ONE published SnapshotData (single source of truth).
 * This module is shared by the server and the admin UI (client-side validation).
 */

export const LOCALES = ["uk", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const isoDate = z.string().refine(isValidIsoDate, "Дата має бути у форматі РРРР-ММ-ДД");

// Plain text only: no markup, no control characters. Rendering escapes text anyway
// (React / Satori), this is defence in depth and keeps the data clean.
const FORBIDDEN_TEXT = /<[^>]*>|javascript:|data:text\/html|on\w+\s*=|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/i;
export const plainText = (max: number) =>
  z
    .string()
    .max(max, `Не більше ${max} символів`)
    .refine((s) => !FORBIDDEN_TEXT.test(s), "HTML, скрипти та керівні символи заборонені")
    .transform((s) => s.replace(/\r\n?/g, "\n").trim());

export const localizedText = (max: number) => z.object({ uk: plainText(max), en: plainText(max) });

export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => {
    if (s === "") return true;
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Потрібне посилання https://…");

export const CATEGORY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  id: z.string().min(2).max(48).regex(CATEGORY_ID, "Ідентифікатор: латиниця, цифри, дефіс"),
  iconId: z.enum(CATEGORY_ICON_IDS as [string, ...string[]]),
  value: z.number().int("Ціле число").min(0, "Не може бути від'ємним").max(1_000_000),
  order: z.number().int().min(0).max(1000),
  hidden: z.boolean(),
  name: localizedText(160),
  description: localizedText(600),
});
export type Category = z.infer<typeof categorySchema>;

/** A published IMI figure at an earlier date — the dynamics chart. Every point needs a source. */
export const historyPointSchema = z.object({
  date: isoDate,
  total: z.number().int().min(0).max(1_000_000).nullable(),
  killedTotal: z.number().int().min(0).max(100_000).nullable(),
  killedOnDuty: z.number().int().min(0).max(100_000).nullable(),
  note: localizedText(300),
  source: httpsUrl,
});
export type HistoryPoint = z.infer<typeof historyPointSchema>;

/** Short editorial summary per calendar year. */
export const historyYearSchema = z.object({
  year: z.number().int().min(2022).max(2100),
  killedInYear: z.number().int().min(0).max(100_000).nullable(),
  note: localizedText(300),
  source: httpsUrl,
});
export type HistoryYear = z.infer<typeof historyYearSchema>;

export const snapshotDataSchema = z.object({
  schemaVersion: z.literal(1),
  /** Main cumulative figure, as published by IMI. Never derived from categories. */
  totalCrimes: z.number().int().min(0).max(1_000_000),
  monitoringStart: isoDate,
  asOfDate: isoDate,
  /** Latest monthly reporting period (e.g. 24 Sep – 24 Oct) and its new cases. */
  period: z.object({
    start: isoDate.nullable(),
    end: isoDate.nullable(),
    newCases: z.number().int().min(0).max(100_000).nullable(),
  }),
  casualties: z.object({
    killedTotal: z.number().int().min(0).max(100_000).nullable(),
    killedOnDuty: z.number().int().min(0).max(100_000).nullable(),
  }),
  texts: z.object({
    /** e.g. "4 роки і 8 місяців повномасштабної війни" */
    periodLabel: localizedText(120),
    /** Optional public note from the editors. */
    editorNote: localizedText(1200),
  }),
  sources: z.object({
    articleUk: httpsUrl,
    articleEn: httpsUrl,
    registry: httpsUrl,
  }),
  categories: z.array(categorySchema).max(40),
  /** Earlier published totals (dynamics chart) and per-year notes. */
  history: z
    .object({
      points: z.array(historyPointSchema).max(500),
      years: z.array(historyYearSchema).max(100),
    })
    .default({ points: [], years: [] }),
  verification: z.object({
    /** Editor confirms the figures were checked against the IMI source publication. */
    sourceChecked: z.boolean(),
    /** Editor confirms a category-sum ≠ total discrepancy is methodological. */
    sumMismatchConfirmed: z.boolean(),
    /** Public explanation of the discrepancy (shown in the methodology block). */
    sumMismatchExplanation: localizedText(600),
    /** Internal note — never shown publicly. */
    internalNote: plainText(2000),
  }),
});

export type SnapshotData = z.infer<typeof snapshotDataSchema>;
export type SnapshotDataInput = z.input<typeof snapshotDataSchema>;

export function visibleCategories(data: Pick<SnapshotData, "categories">): Category[] {
  return data.categories.filter((c) => !c.hidden).sort((a, b) => a.order - b.order);
}

export function categorySum(data: Pick<SnapshotData, "categories">): number {
  return visibleCategories(data).reduce((s, c) => s + c.value, 0);
}

/** Public, sanitised view of a published snapshot (no internal notes). */
export interface PublicSnapshot {
  id: number;
  periodKey: string;
  revision: number;
  publishedAt: string | null;
  checksum: string;
  data: Omit<SnapshotData, "verification"> & {
    verification: Pick<SnapshotData["verification"], "sumMismatchConfirmed" | "sumMismatchExplanation">;
  };
}

export function toPublicData(data: SnapshotData): PublicSnapshot["data"] {
  const { verification, ...rest } = data;
  return {
    ...rest,
    verification: {
      sumMismatchConfirmed: verification.sumMismatchConfirmed,
      sumMismatchExplanation: verification.sumMismatchExplanation,
    },
  };
}

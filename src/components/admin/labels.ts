import type { SnapshotStatus } from "@/lib/db/types";

export const STATUS_LABEL: Record<SnapshotStatus, string> = {
  draft: "Чернетка",
  review: "На перевірці",
  published: "Опубліковано",
  superseded: "Замінено новішою версією",
  withdrawn: "Знято з публікації",
};

export const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Вхід",
  "auth.logout": "Вихід",
  "auth.fail": "Невдала спроба входу",
  "auth.locked": "Вхід заблоковано (забагато спроб)",
  "draft.create": "Створено чернетку",
  "draft.save": "Збережено чернетку",
  "draft.delete": "Видалено чернетку",
  "verification.update": "Оновлено підтвердження",
  "review.submit": "Передано на перевірку",
  "review.return": "Повернуто в чернетку",
  publish: "Опубліковано",
  withdraw: "Знято з публікації",
  restore: "Відновлено попередню версію",
  "backup.download": "Завантажено резервну копію",
  "backup.import-drafts": "Імпортовано знімки як чернетки",
  "backup.restore-full": "Повне відновлення з копії (CLI)",
  "admin.create": "Створено адміністратора (CLI)",
  "admin.password-reset": "Змінено пароль (CLI)",
  seed: "Завантажено стартові дані",
};

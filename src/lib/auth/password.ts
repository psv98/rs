import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id, above the OWASP 2024 minimum (m=19 MiB, t=2): 64 MiB, 3 passes.
const PARAMS = { algorithm: 2 /* Algorithm.Argon2id */, memoryCost: 65536, timeCost: 3, parallelism: 1, outputLen: 32 } as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

/** Pre-computed hash used to keep timing equal when the username does not exist. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  if (!dummyHash) dummyHash = hashPassword("dummy-password-for-constant-time-checks");
  return dummyHash;
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    if (!stored.startsWith("$argon2id$")) return false;
    return await verify(stored, password);
  } catch {
    return false;
  }
}

const COMMON = ["password", "qwerty", "123456", "admin", "imi", "letmein", "ukraine", "slava", "parol", "пароль"];

/** Length-first policy (NIST SP 800-63B): long passphrases, no composition rules. */
export function passwordProblems(password: string, username: string): string[] {
  const problems: string[] = [];
  if (password.length < 14) problems.push("Пароль має містити щонайменше 14 символів (краще фраза з кількох слів).");
  if (password.length > 256) problems.push("Пароль задовгий (максимум 256 символів).");
  const lower = password.toLowerCase();
  if (username && lower.includes(username.toLowerCase())) problems.push("Пароль не повинен містити ім'я користувача.");
  if (COMMON.some((w) => lower.replace(/[^a-zа-яіїєґ0-9]/g, "") === w || lower === w))
    problems.push("Пароль занадто поширений.");
  if (new Set(password).size < 6) problems.push("Пароль містить замало різних символів.");
  return problems;
}

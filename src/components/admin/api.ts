"use client";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

/** JSON fetch with the per-session CSRF token; same-origin cookies only. */
export async function api<T = unknown>(csrf: string, path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: method === "GET" ? {} : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new ApiError(401, "unauthorized", "Сесія завершилась");
  }
  if (!res.ok) throw new ApiError(res.status, json.error ?? "error", json.message ?? `Помилка ${res.status}`, json.details);
  return json as T;
}

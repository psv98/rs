"use client";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        try {
          const res = await fetch("/api/admin/login", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.message ?? "Не вдалося увійти");
          window.location.href = "/admin";
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/imi-logo-uk.svg" alt="Інститут масової інформації" style={{ height: 48, width: "auto" }} />
      <h1>Вхід для редактора</h1>
      <label className="adm-field">
        <span>Ім&apos;я користувача</span>
        <input className="adm-input" name="username" autoComplete="username" required maxLength={64} />
      </label>
      <label className="adm-field">
        <span>Пароль</span>
        <input className="adm-input" name="password" type="password" autoComplete="current-password" required maxLength={256} />
      </label>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--primary" type="submit" disabled={busy}>
        {busy ? "Перевіряємо…" : "Увійти"}
      </button>
    </form>
  );
}

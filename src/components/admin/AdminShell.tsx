import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

export function AdminShell({ username, csrf, current, children }: { username: string; csrf: string; current: "home" | "audit" | "backups" | "editor"; children: ReactNode }) {
  return (
    <div className="adm">
      <header className="adm-top">
        <a href="/admin" aria-label="Адмін-панель">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/imi-logo-uk.svg" alt="ІМІ" />
        </a>
        <nav aria-label="Адмін-панель">
          <a href="/admin" aria-current={current === "home" ? "page" : undefined}>
            Знімки
          </a>
          <a href="/admin/audit" aria-current={current === "audit" ? "page" : undefined}>
            Журнал змін
          </a>
          <a href="/admin/backups" aria-current={current === "backups" ? "page" : undefined}>
            Резервні копії
          </a>
          <a href="/" target="_blank" rel="noopener">
            Сайт
          </a>
        </nav>
        <span className="who">{username}</span>
        <LogoutButton csrf={csrf} />
      </header>
      <main className="adm-main" id="main">
        {children}
      </main>
    </div>
  );
}

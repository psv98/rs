"use client";
import { api } from "./api";

export function LogoutButton({ csrf }: { csrf: string }) {
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await api(csrf, "/api/admin/logout", "POST").catch(() => undefined);
        window.location.href = "/admin/login";
      }}
    >
      Вийти
    </button>
  );
}

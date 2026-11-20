"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n/dictionaries";
import { BASE_PATH } from "@/lib/site";
import { Glyph } from "../ui/Glyph";

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * When someone copies text from the site, the clipboard gets the text plus a line naming IMI
 * as the source, and a short notice says so. Copying inside form fields is left alone.
 */
export function CopyCredit() {
  const pathname = usePathname();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "uk";
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const text = window.getSelection()?.toString() ?? "";
      if (!text.trim() || !e.clipboardData) return;
      const d = t(locale);
      const url = `${window.location.origin}${BASE_PATH}${locale === "en" ? "/en/" : "/"}`;
      const credit = d.hero.copySource(url);
      e.clipboardData.setData("text/plain", `${text}\n\n${credit}`);
      e.clipboardData.setData(
        "text/html",
        `${escapeHtml(text).replace(/\n/g, "<br>")}<br><br>${escapeHtml(credit.replace(url, ""))}<a href="${url}">${url}</a>`,
      );
      e.preventDefault();
      setShown(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShown(false), 3500);
    };
    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("copy", onCopy);
      window.clearTimeout(timer.current);
    };
  }, [locale]);

  const d = t(locale);
  return (
    <div className="copy-toast" data-shown={shown || undefined} role="status" aria-live="polite">
      {shown && (
        <>
          <Glyph name="link" />
          <b>{d.hero.copied}</b>
          <span>{d.hero.copiedNote}</span>
        </>
      )}
    </div>
  );
}

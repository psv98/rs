"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Keeps <html lang> right after a client-side switch between / and /en. */
export function LangSync() {
  const pathname = usePathname();
  useEffect(() => {
    const lang = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "uk";
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
  }, [pathname]);
  return null;
}

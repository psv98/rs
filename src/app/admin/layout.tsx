import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootDocument } from "@/components/site/RootDocument";
import "./admin.css";

export const metadata: Metadata = {
  title: "Адмін-панель — ІМІ",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RootDocument lang="uk">{children}</RootDocument>;
}

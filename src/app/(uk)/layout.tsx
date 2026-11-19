import type { ReactNode } from "react";
import { RootDocument } from "@/components/site/RootDocument";

export default function UkLayout({ children }: { children: ReactNode }) {
  return <RootDocument lang="uk">{children}</RootDocument>;
}

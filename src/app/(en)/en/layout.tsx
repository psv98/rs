import type { ReactNode } from "react";
import { RootDocument } from "@/components/site/RootDocument";

export default function EnLayout({ children }: { children: ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}

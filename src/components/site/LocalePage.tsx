import type { Locale } from "@/lib/data/schema";
import { getPublicState } from "@/lib/data/public";
import { parseFilters } from "@/lib/seo";
import { config } from "@/lib/config";
import { HomePage } from "./HomePage";

export async function LocalePage({ locale, searchParams }: { locale: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [state, sp] = await Promise.all([getPublicState(), searchParams]);
  return <HomePage locale={locale} state={state} initial={parseFilters(sp)} siteUrl={config.siteUrl} />;
}

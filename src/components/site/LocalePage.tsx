import type { Locale } from "@/lib/data/schema";
import { dynamicInServerMode, getPublicState } from "@/lib/data/public";
import { config } from "@/lib/config";
import { HomePage } from "./HomePage";

/** Filters (?year, ?s, ?cmp, ?cat) are read in the browser, so the same page works as static HTML. */
export async function LocalePage({ locale }: { locale: Locale }) {
  await dynamicInServerMode();
  const state = await getPublicState();
  return <HomePage locale={locale} state={state} siteUrl={config.siteUrl} />;
}

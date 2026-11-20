import { t } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/data/schema";

/** Centre caption of the ring: who counted it and as of when. It ends up in every screenshot of the ring. */
export function RingCaption({ locale, date }: { locale: Locale; date: string }) {
  const d = t(locale);
  const [lead, org] = d.hero.ringSource;
  return (
    <>
      {lead} <b className="ring__source">{org}</b>, <span className="nowrap">{d.hero.ringAsOf(date)}</span>
    </>
  );
}

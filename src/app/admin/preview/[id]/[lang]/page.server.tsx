import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { getSnapshot, listPublished } from "@/lib/data/repository";
import { toPublicData, type PublicSnapshot } from "@/lib/data/schema";
import { HomePage } from "@/components/site/HomePage";
import { config } from "@/lib/config";
import { STATUS_LABEL } from "@/components/admin/labels";
import { DomainError } from "@/lib/data/errors";

export const dynamic = "force-dynamic";

/** How the public page WILL look with this snapshot — admin only, never cached or indexed. */
export default async function PreviewPage(props: { params: Promise<{ id: string; lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const { id, lang } = await props.params;
  if (lang !== "uk" && lang !== "en") notFound();
  const db = getDb();
  let snap;
  try {
    snap = await getSnapshot(db, Number.parseInt(id, 10));
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  }
  const asPublic: PublicSnapshot = { id: snap.id, periodKey: snap.periodKey, revision: snap.revision, publishedAt: snap.publishedAt, checksum: snap.checksum, data: toPublicData(snap.data) };
  const others = (await listPublished(db))
    .filter((p) => p.periodKey !== snap.periodKey)
    .map((p) => ({ id: p.id, periodKey: p.periodKey, revision: p.revision, publishedAt: p.publishedAt, checksum: p.checksum, data: toPublicData(p.data) }));
  const history = [asPublic, ...others].sort((a, b) => (a.periodKey < b.periodKey ? 1 : -1));
  const current = history[0]!;
  const banner =
    current.id === snap.id
      ? `Попередній перегляд · ${STATUS_LABEL[snap.status]} #${snap.id} · не є публічною версією`
      : `Попередній перегляд · знімок #${snap.id} старіший за поточну публікацію, тому на сайті він з'явиться лише в історії`;
  return (
    <HomePage
      locale={lang}
      state={{ current, history }}
      siteUrl={config.siteUrl}
      exportMode={{ kind: "admin", id: snap.id }}
      banner={banner}
      ukPath={`/admin/preview/${snap.id}/uk`}
      enPath={`/admin/preview/${snap.id}/en`}
    />
  );
}

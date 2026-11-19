import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { getSnapshot, listPublished, previousPublished } from "@/lib/data/repository";
import { todayIso } from "@/lib/data/dates";
import { DomainError } from "@/lib/data/errors";
import { AdminShell } from "@/components/admin/AdminShell";
import { SnapshotEditor } from "@/components/admin/SnapshotEditor";

export const dynamic = "force-dynamic";

export default async function SnapshotPage(props: { params: Promise<{ id: string }> }) {
  const session = await requireAdminPage();
  const db = getDb();
  const { id } = await props.params;
  let snap;
  try {
    snap = await getSnapshot(db, Number.parseInt(id, 10));
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  }
  const [prev, published] = await Promise.all([previousPublished(db, snap.periodKey), listPublished(db)]);
  const samePeriod = published.find((p) => p.periodKey === snap.periodKey && p.id !== snap.id) ?? null;
  const currentPublic = published[0] ?? null;
  return (
    <AdminShell username={session.username} csrf={session.csrfToken} current="editor">
      <SnapshotEditor
        csrf={session.csrfToken}
        snapshot={snap}
        previous={prev ? { id: prev.id, periodKey: prev.periodKey, data: prev.data } : null}
        samePeriodPublished={samePeriod ? { id: samePeriod.id, periodKey: samePeriod.periodKey, data: samePeriod.data } : null}
        currentPublic={currentPublic ? { id: currentPublic.id, periodKey: currentPublic.periodKey, data: currentPublic.data } : null}
        today={todayIso()}
      />
    </AdminShell>
  );
}

import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/auth/guard";
import { buildPublishedFile } from "@/lib/data/published-file";
import { audit } from "@/lib/data/repository";

/** data/published/snapshots.json for the GitHub Pages build (published snapshots only). */
export const GET = adminRoute(
  async ({ db, actor }) => {
    const file = await buildPublishedFile(db);
    await audit(db, actor, "pages.export", null, { snapshots: file.snapshots.length });
    return new NextResponse(JSON.stringify(file, null, 2) + "\n", {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="snapshots.json"',
        "Cache-Control": "no-store",
      },
    });
  },
  { mutating: false },
);

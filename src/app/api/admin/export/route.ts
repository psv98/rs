import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/auth/guard";
import { getSnapshot } from "@/lib/data/repository";
import { toPublicData } from "@/lib/data/schema";
import { planSlides, renderOg, renderSlide } from "@/lib/export/render";
import { parseLocale, rendered } from "@/lib/export/http";

/** PNG preview of ANY snapshot (incl. drafts) — admin only, never cached publicly. */
export const GET = adminRoute(
  async ({ req, db }) => {
    const sp = req.nextUrl.searchParams;
    const id = Number.parseInt(sp.get("id") ?? "", 10);
    const format = sp.get("format");
    const locale = parseLocale(sp.get("lang")) ?? "uk";
    const slide = Number.parseInt(sp.get("slide") ?? "1", 10);
    const snap = await getSnapshot(db, id);
    const data = toPublicData(snap.data);
    const headers = { "Content-Type": "image/png", "Cache-Control": "private, no-store" };
    const key = `admin-${snap.id}-${snap.checksum}`;
    if (format === "og") return rendered(() => renderOg(data, key, locale), headers);
    if (format !== "social" && format !== "wide") return NextResponse.json({ error: "bad-format" }, { status: 400 });
    if (slide < 1 || slide > planSlides(data, format).length) return NextResponse.json({ error: "bad-slide" }, { status: 400 });
    return rendered(() => renderSlide(data, key, format, locale, slide), headers);
  },
  { mutating: false },
);

import { NextResponse, type NextRequest } from "next/server";
import { getPublicState } from "@/lib/data/public";
import { fileName, planSlides, renderSlide, type ExportFormat } from "@/lib/export/render";
import { limited, parseLocale, rendered } from "@/lib/export/http";
import { handleError } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** Public PNG export — ONLY the current published snapshot, no authentication needed. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ format: string }> }) {
  try {
    const { format } = await ctx.params;
    if (format !== "social" && format !== "wide") return NextResponse.json({ error: "not-found" }, { status: 404 });
    const locale = parseLocale(req.nextUrl.searchParams.get("lang")) ?? "uk";
    const slide = Number.parseInt(req.nextUrl.searchParams.get("slide") ?? "1", 10);
    const tooMany = limited(req, "export");
    if (tooMany) return tooMany;
    const { current } = await getPublicState();
    if (!current) return NextResponse.json({ error: "no-data", message: "Ще немає опублікованих даних" }, { status: 404 });
    const specs = planSlides(current.data, format as ExportFormat);
    if (!Number.isInteger(slide) || slide < 1 || slide > specs.length) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const download = req.nextUrl.searchParams.get("download") === "1";
    const name = fileName(current.data, format as ExportFormat, locale, slide, specs.length);
    return rendered(
      () => renderSlide(current.data, current.checksum, format as ExportFormat, locale, slide),
      {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      },
      `"${current.checksum.slice(0, 16)}-${format}-${locale}-${slide}"`,
      req,
    );
  } catch (e) {
    return handleError(e);
  }
}

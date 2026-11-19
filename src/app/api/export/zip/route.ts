import { NextResponse, type NextRequest } from "next/server";
import { getPublicState } from "@/lib/data/public";
import { renderZip, type ExportFormat } from "@/lib/export/render";
import { limited, parseLocale, rendered } from "@/lib/export/http";
import { handleError } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** ZIP with all slides: ?set=social (1080×1350 series) or ?set=all (every format). */
export async function GET(req: NextRequest) {
  try {
    const locale = parseLocale(req.nextUrl.searchParams.get("lang")) ?? "uk";
    const set = req.nextUrl.searchParams.get("set") === "social" ? "social" : "all";
    const tooMany = limited(req, "export-zip", 6, 6);
    if (tooMany) return tooMany;
    const { current } = await getPublicState();
    if (!current) return NextResponse.json({ error: "no-data" }, { status: 404 });
    const formats: ExportFormat[] = set === "social" ? ["social"] : ["social", "wide"];
    const name = `imi-russias-crimes_${current.data.asOfDate}_${locale}_${set === "social" ? "1080x1350" : "all-slides"}.zip`;
    return rendered(() => renderZip(current.data, current.checksum, locale, formats), {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "public, max-age=300",
    });
  } catch (e) {
    return handleError(e);
  }
}

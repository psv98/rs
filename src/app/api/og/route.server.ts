import { type NextRequest } from "next/server";
import { getPublicState } from "@/lib/data/public";
import { renderOg } from "@/lib/export/render";
import { limited, parseLocale, rendered } from "@/lib/export/http";
import { handleError } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** Open Graph / X card image generated from the current published data. */
export async function GET(req: NextRequest) {
  try {
    const locale = parseLocale(req.nextUrl.searchParams.get("lang")) ?? "uk";
    const tooMany = limited(req, "og", 60, 60);
    if (tooMany) return tooMany;
    const { current } = await getPublicState();
    return rendered(
      () => renderOg(current?.data ?? null, current?.checksum ?? "empty", locale),
      { "Content-Type": "image/png", "Cache-Control": "public, max-age=600, stale-while-revalidate=3600" },
      `"og-${(current?.checksum ?? "empty").slice(0, 16)}-${locale}"`,
      req,
    );
  } catch (e) {
    return handleError(e);
  }
}

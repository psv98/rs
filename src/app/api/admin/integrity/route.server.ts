import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/auth/guard";
import { integrityReport } from "@/lib/data/repository";

export const GET = adminRoute(async ({ db }) => NextResponse.json({ report: await integrityReport(db) }), { mutating: false });

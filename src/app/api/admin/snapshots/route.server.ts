import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, readJson } from "@/lib/auth/guard";
import { createDraft, listSnapshots } from "@/lib/data/repository";
import { DomainError } from "@/lib/data/errors";

export const GET = adminRoute(
  async ({ db }) => {
    const items = await listSnapshots(db);
    return NextResponse.json({
      snapshots: items.map((s) => ({
        id: s.id,
        periodKey: s.periodKey,
        revision: s.revision,
        status: s.status,
        totalCrimes: s.data.totalCrimes,
        updatedAt: s.updatedAt,
        publishedAt: s.publishedAt,
        checksumValid: s.checksumValid,
      })),
    });
  },
  { mutating: false },
);

const createSchema = z.object({ fromId: z.number().int().positive().nullable().default(null), changeNote: z.string().max(500).default("") });

export const POST = adminRoute(
  async ({ req, db, actor }) => {
    const body = createSchema.safeParse(await readJson(req));
    if (!body.success) throw new DomainError("invalid", "Некоректний запит", 400);
    const id = await createDraft(db, actor, body.data.fromId, body.data.changeNote);
    return NextResponse.json({ id }, { status: 201 });
  },
  { mutating: true },
);

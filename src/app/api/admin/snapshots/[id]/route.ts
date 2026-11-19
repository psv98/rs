import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, readJson } from "@/lib/auth/guard";
import { deleteDraft, getSnapshot, updateDraft } from "@/lib/data/repository";
import { DomainError } from "@/lib/data/errors";

type P = { id: string };
const idOf = (p: P) => {
  const id = Number.parseInt(p.id, 10);
  if (!Number.isSafeInteger(id) || id <= 0) throw new DomainError("not-found", "Знімок не знайдено", 404);
  return id;
};

export const GET = adminRoute<P>(
  async ({ db, params }) => NextResponse.json({ snapshot: await getSnapshot(db, idOf(params)) }),
  { mutating: false },
);

const putSchema = z.object({ data: z.unknown(), expectedUpdatedAt: z.string().max(40), changeNote: z.string().max(500).optional() });

export const PUT = adminRoute<P>(
  async ({ req, db, actor, params }) => {
    const body = putSchema.safeParse(await readJson(req));
    if (!body.success) throw new DomainError("invalid", "Некоректний запит", 400);
    const snapshot = await updateDraft(db, actor, idOf(params), body.data.data, body.data.expectedUpdatedAt, body.data.changeNote);
    return NextResponse.json({ snapshot });
  },
  { mutating: true },
);

export const DELETE = adminRoute<P>(
  async ({ db, actor, params }) => {
    await deleteDraft(db, actor, idOf(params));
    return NextResponse.json({ ok: true });
  },
  { mutating: true },
);

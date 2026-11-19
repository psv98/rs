import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, readJson } from "@/lib/auth/guard";
import { updateVerification } from "@/lib/data/repository";
import { snapshotDataSchema } from "@/lib/data/schema";
import { DomainError } from "@/lib/data/errors";

const schema = z.object({ verification: snapshotDataSchema.shape.verification, expectedUpdatedAt: z.string().max(40) });

export const PUT = adminRoute<{ id: string }>(
  async ({ req, db, actor, params }) => {
    const body = schema.safeParse(await readJson(req));
    if (!body.success) throw new DomainError("invalid", "Некоректні дані перевірки", 422, body.error.issues);
    const snapshot = await updateVerification(db, actor, Number.parseInt(params.id, 10), body.data.verification, body.data.expectedUpdatedAt);
    return NextResponse.json({ snapshot });
  },
  { mutating: true },
);

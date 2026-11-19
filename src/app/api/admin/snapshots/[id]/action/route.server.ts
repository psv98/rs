import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, readJson } from "@/lib/auth/guard";
import { getSnapshot, publish, restore, returnToDraft, submitForReview, withdraw } from "@/lib/data/repository";
import { DomainError } from "@/lib/data/errors";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("return") }),
  z.object({ action: z.literal("publish"), confirmation: z.string().max(20) }),
  z.object({ action: z.literal("withdraw"), confirmation: z.string().max(20), reason: z.string().max(500) }),
  z.object({ action: z.literal("restore"), confirmation: z.string().max(20), reason: z.string().max(500) }),
]);

export const POST = adminRoute<{ id: string }>(
  async ({ req, db, actor, params }) => {
    const id = Number.parseInt(params.id, 10);
    if (!Number.isSafeInteger(id)) throw new DomainError("not-found", "Знімок не знайдено", 404);
    const body = schema.safeParse(await readJson(req));
    if (!body.success) throw new DomainError("invalid", "Некоректна дія", 400);
    const a = body.data;
    switch (a.action) {
      case "submit":
        await submitForReview(db, actor, id);
        break;
      case "return":
        await returnToDraft(db, actor, id);
        break;
      case "publish":
        await publish(db, actor, id, a.confirmation);
        break;
      case "withdraw":
        await withdraw(db, actor, id, a.reason, a.confirmation);
        break;
      case "restore":
        await restore(db, actor, id, a.reason, a.confirmation);
        break;
    }
    return NextResponse.json({ snapshot: await getSnapshot(db, id) });
  },
  { mutating: true },
);

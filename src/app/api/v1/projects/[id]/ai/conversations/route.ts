import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { createConversation, listConversations } from "@/lib/ai/runs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const conversations = await listConversations(id);
  return json({ conversations });
});

const createSchema = z.object({ title: z.string().trim().min(1).max(100).optional() });

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = req.headers.get("content-length") === "0" || !req.headers.get("content-type") ? {} : await parseBody(req, createSchema);
  const conversation = await createConversation(id, user.id, body.title ?? "New chat");
  return json({ conversation }, { status: 201 });
});

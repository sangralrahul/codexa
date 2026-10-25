import { handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { getConversation, listMessages, listRunsForConversation } from "@/lib/ai/runs";

type Ctx = { params: Promise<{ id: string; cid: string }> };

/** GET → { conversation, messages, runs } (runs keyed by assistant messageId on the client). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, cid } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const conversation = await getConversation(id, cid);
  if (!conversation) throw notFound("Conversation");
  const [messages, runs] = await Promise.all([listMessages(cid), listRunsForConversation(cid)]);
  return json({
    conversation,
    messages,
    runs: runs.map((r) => ({
      id: r.id,
      messageId: r.messageId,
      status: r.status,
      stage: r.stage,
      changedFiles: r.changedFiles,
      snapshotBeforeId: r.snapshotBeforeId,
      error: r.error,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      repairAttempts: r.repairAttempts,
      createdAt: r.createdAt,
      finishedAt: r.finishedAt,
    })),
  });
});

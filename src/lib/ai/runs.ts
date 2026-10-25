import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, generationRuns, messages, type GenerationRun, type MessagePart } from "@/db/schema";

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------
export async function listConversations(projectId: string, limit = 50) {
  return db.select().from(conversations).where(eq(conversations.projectId, projectId)).orderBy(desc(conversations.updatedAt)).limit(limit);
}

export async function getConversation(projectId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), eq(conversations.id, conversationId)))
    .limit(1);
  return rows[0] ?? null;
}

export function titleFromPrompt(prompt: string): string {
  const firstLine = prompt.trim().split("\n")[0] ?? "";
  const t = firstLine.replace(/\s+/g, " ").trim();
  return (t.length > 60 ? t.slice(0, 57) + "…" : t) || "New chat";
}

export async function createConversation(projectId: string, userId: string, title = "New chat") {
  const [row] = await db.insert(conversations).values({ projectId, createdBy: userId, title: title.slice(0, 100) }).returning();
  return row;
}

export async function touchConversation(conversationId: string, title?: string) {
  await db
    .update(conversations)
    .set({ updatedAt: new Date(), ...(title ? { title: title.slice(0, 100) } : {}) })
    .where(eq(conversations.id, conversationId));
}

export async function listMessages(conversationId: string, limit = 200) {
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt)).limit(limit);
}

export async function insertMessage(input: { conversationId: string; role: "user" | "assistant" | "system"; content: string; parts?: MessagePart[]; model?: string | null }) {
  const [row] = await db
    .insert(messages)
    .values({ conversationId: input.conversationId, role: input.role, content: input.content, parts: input.parts ?? [], model: input.model ?? null })
    .returning();
  return row;
}

export async function updateMessage(messageId: string, patch: { content?: string; parts?: MessagePart[]; tokensIn?: number; tokensOut?: number; model?: string | null }) {
  await db.update(messages).set(patch).where(eq(messages.id, messageId));
}

// ---------------------------------------------------------------------------
// Generation runs
// ---------------------------------------------------------------------------
export async function createRun(input: { projectId: string; conversationId: string; messageId: string; userId: string; provider: string; model: string }) {
  const [row] = await db
    .insert(generationRuns)
    .values({ ...input, status: "queued", stage: "queued" })
    .returning();
  return row;
}

export async function updateRun(runId: string, patch: Partial<Omit<GenerationRun, "id" | "projectId" | "createdAt">>) {
  const [row] = await db.update(generationRuns).set(patch).where(eq(generationRuns.id, runId)).returning();
  return row ?? null;
}

export async function getRun(projectId: string, runId: string) {
  const rows = await db
    .select()
    .from(generationRuns)
    .where(and(eq(generationRuns.projectId, projectId), eq(generationRuns.id, runId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRunStatus(runId: string): Promise<GenerationRun["status"] | null> {
  const rows = await db.select({ status: generationRuns.status }).from(generationRuns).where(eq(generationRuns.id, runId)).limit(1);
  return rows[0]?.status ?? null;
}

// In-process registry so a cancel request can abort the provider stream
// immediately when it lands on the same instance. Cross-instance cancels are
// picked up by the DB status check between steps.
const activeRuns = new Map<string, AbortController>();

export function registerActiveRun(runId: string, controller: AbortController) {
  activeRuns.set(runId, controller);
}
export function unregisterActiveRun(runId: string) {
  activeRuns.delete(runId);
}

/** Mark a run cancelled. Returns the updated row or null if it cannot be cancelled. */
export async function cancelRun(projectId: string, runId: string) {
  const run = await getRun(projectId, runId);
  if (!run) return null;
  if (run.status !== "queued" && run.status !== "running") return run;
  const updated = await updateRun(runId, { status: "cancelled", stage: "cancelled", finishedAt: new Date() });
  activeRuns.get(runId)?.abort();
  return updated;
}

export async function listRunsForConversation(conversationId: string) {
  return db.select().from(generationRuns).where(eq(generationRuns.conversationId, conversationId)).orderBy(asc(generationRuns.createdAt));
}

import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(input: {
  actorId?: string | null;
  workspaceId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    workspaceId: input.workspaceId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    ip: input.ip ?? null,
  });
}

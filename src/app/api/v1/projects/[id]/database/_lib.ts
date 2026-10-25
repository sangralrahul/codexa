import "server-only";
import { ApiError } from "@/lib/api";
import { resolveDatabaseConnection } from "@/lib/integrations/connections";
import { ConfirmationRequiredError, DatabaseQueryError } from "@/lib/integrations/database";

/** Resolve a connection id that must belong to the project's workspace (404 otherwise). */
export async function connectionForProject(workspaceId: string, connectionId: string | null | undefined) {
  if (!connectionId) throw new ApiError(400, "connectionId is required", "bad_request");
  return resolveDatabaseConnection(workspaceId, connectionId);
}

/** Map database-layer errors to API errors. */
export function mapDatabaseError(err: unknown): never {
  if (err instanceof ConfirmationRequiredError) {
    throw new ApiError(409, err.message, "confirmation_required", { reason: err.reasons.join("; "), reasons: err.reasons });
  }
  if (err instanceof DatabaseQueryError) {
    throw new ApiError(err.code === "bad_request" ? 400 : 422, err.message, err.code);
  }
  throw err;
}

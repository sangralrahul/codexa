/** Shared types for workspace integrations (no server-only import so tests and the client can use them). */

export type ConnectionTestResult = {
  ok: boolean;
  /** Human readable, never contains secrets. */
  message: string;
  /** Non-secret details for display (e.g. server version, model count). */
  details?: Record<string, unknown>;
};

export type ProviderAdapter = {
  id: string;
  /** Validate the non-secret config + secret values before storing. Throws Error with a friendly message. */
  validate?: (config: Record<string, string>, secret: Record<string, string>) => void;
  /** Perform a live connection test. Must never throw; returns ok=false with a safe message instead. */
  test: (config: Record<string, string>, secret: Record<string, string>) => Promise<ConnectionTestResult>;
};

export type ConnectionStatus = "unverified" | "connected" | "error";

/** Shape returned to the browser (secrets masked). */
export type ConnectionDto = {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  config: Record<string, string>;
  /** Secret field keys that are stored (values never returned). */
  secretKeys: string[];
  status: ConnectionStatus;
  lastTestedAt: string | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export const SECRET_MASK = "••••••••";

export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  foreignKey: { table: string; column: string } | null;
};

export type TableInfo = {
  schema: string;
  name: string;
  kind: "table" | "view";
  rowEstimate: number | null;
  columns: ColumnInfo[];
  primaryKey: string[];
};

export type QueryField = { name: string; dataTypeId: number };

export type QueryResultDto = {
  rows: Record<string, unknown>[];
  fields: QueryField[];
  rowCount: number;
  durationMs: number;
  command: string | null;
  truncated: boolean;
  readOnly: boolean;
};

export const QUERY_ROW_LIMIT = 500;

import { getIntegration, secretFieldKeys } from "@/config/integrations";
import { SECRET_MASK, type ConnectionDto } from "./types";

type Row = {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  config: Record<string, unknown>;
  secretEnc: string | null;
  status: string;
  lastTestedAt: Date | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Split submitted config into non-secret config and secret values using the provider definition. */
export function splitConfig(provider: string, input: Record<string, string>) {
  const def = getIntegration(provider);
  const secretKeys = new Set(def ? secretFieldKeys(def) : []);
  const config: Record<string, string> = {};
  const secret: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== "string") continue;
    if (secretKeys.has(k)) secret[k] = v;
    else config[k] = v;
  }
  return { config, secret, secretKeys: [...secretKeys] };
}

/** Public DTO: config values pass through, secret keys are listed but their values are masked. */
export function toConnectionDto(row: Row, storedSecretKeys: string[]): ConnectionDto {
  const def = getIntegration(row.provider);
  const secretKeys = new Set([...(def ? secretFieldKeys(def) : []), ...storedSecretKeys]);
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries(row.config)) {
    if (secretKeys.has(k)) continue; // never echo a secret even if it ended up in config
    config[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  for (const k of storedSecretKeys) config[k] = SECRET_MASK;
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: row.provider,
    name: row.name,
    config,
    secretKeys: storedSecretKeys,
    status: (row.status as ConnectionDto["status"]) ?? "unverified",
    lastTestedAt: row.lastTestedAt ? row.lastTestedAt.toISOString() : null,
    lastError: row.lastError,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

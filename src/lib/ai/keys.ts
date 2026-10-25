import "server-only";
import { env, capabilities } from "@/lib/env";

export type AiProviderId = "anthropic" | "openai" | "mock";

export const DEFAULT_MODELS: Record<Exclude<AiProviderId, "mock">, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-5",
};

export type AiCredentials = { provider: AiProviderId; model: string; apiKey: string | null; configured: boolean; mock: boolean };

/**
 * Resolve which AI provider/model/key to use for a workspace.
 * Workspace-level keys (integration connections) are wired in after the
 * integrations module lands; environment keys are the default.
 */
export async function resolveAiCredentials(_workspaceId: string): Promise<AiCredentials> {
  const mock = process.env.AI_MOCK === "1" && process.env.NODE_ENV !== "production";
  if (mock) return { provider: "mock", model: "mock-1", apiKey: null, configured: true, mock: true };
  const preferred = env.AI_DEFAULT_PROVIDER;
  if (preferred === "anthropic" && capabilities.anthropic) return { provider: "anthropic", model: env.AI_DEFAULT_MODEL, apiKey: env.ANTHROPIC_API_KEY!, configured: true, mock: false };
  if (preferred === "openai" && capabilities.openai) return { provider: "openai", model: env.AI_DEFAULT_MODEL, apiKey: env.OPENAI_API_KEY!, configured: true, mock: false };
  if (capabilities.anthropic) return { provider: "anthropic", model: env.AI_DEFAULT_MODEL.startsWith("claude") ? env.AI_DEFAULT_MODEL : DEFAULT_MODELS.anthropic, apiKey: env.ANTHROPIC_API_KEY!, configured: true, mock: false };
  if (capabilities.openai) return { provider: "openai", model: env.AI_DEFAULT_MODEL.startsWith("gpt") ? env.AI_DEFAULT_MODEL : DEFAULT_MODELS.openai, apiKey: env.OPENAI_API_KEY!, configured: true, mock: false };
  return { provider: preferred, model: env.AI_DEFAULT_MODEL, apiKey: null, configured: false, mock: false };
}

export type AiStatus = {
  configured: boolean;
  provider: AiProviderId;
  model: string;
  mock: boolean;
  /** Env vars that would enable AI when `configured` is false. */
  missingEnv: string[];
};

/** Public, secret-free description of the AI configuration for the UI. */
export async function getAiStatus(workspaceId: string): Promise<AiStatus> {
  const creds = await resolveAiCredentials(workspaceId);
  return {
    configured: creds.configured,
    provider: creds.provider,
    model: creds.model,
    mock: creds.mock,
    missingEnv: creds.configured ? [] : ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"],
  };
}

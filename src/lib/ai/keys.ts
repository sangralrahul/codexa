import "server-only";
import { env, capabilities } from "@/lib/env";

export type AiProviderId = "anthropic" | "openai" | "mock";

/**
 * Resolve which AI provider/model/key to use for a workspace.
 * Workspace-level keys (integration connections) are wired in after the
 * integrations module lands; environment keys are the default.
 */
export async function resolveAiCredentials(_workspaceId: string): Promise<{ provider: AiProviderId; model: string; apiKey: string | null; configured: boolean; mock: boolean }> {
  const mock = process.env.AI_MOCK === "1" && process.env.NODE_ENV !== "production";
  if (mock) return { provider: "mock", model: "mock-1", apiKey: null, configured: true, mock: true };
  const preferred = env.AI_DEFAULT_PROVIDER;
  if (preferred === "anthropic" && capabilities.anthropic) return { provider: "anthropic", model: env.AI_DEFAULT_MODEL, apiKey: env.ANTHROPIC_API_KEY!, configured: true, mock: false };
  if (preferred === "openai" && capabilities.openai) return { provider: "openai", model: env.AI_DEFAULT_MODEL, apiKey: env.OPENAI_API_KEY!, configured: true, mock: false };
  if (capabilities.anthropic) return { provider: "anthropic", model: env.AI_DEFAULT_MODEL.startsWith("claude") ? env.AI_DEFAULT_MODEL : "claude-sonnet-5-5", apiKey: env.ANTHROPIC_API_KEY!, configured: true, mock: false };
  if (capabilities.openai) return { provider: "openai", model: env.AI_DEFAULT_MODEL.startsWith("gpt") ? env.AI_DEFAULT_MODEL : "gpt-5", apiKey: env.OPENAI_API_KEY!, configured: true, mock: false };
  return { provider: preferred, model: env.AI_DEFAULT_MODEL, apiKey: null, configured: false, mock: false };
}

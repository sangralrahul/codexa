import "server-only";
import { env, capabilities } from "@/lib/env";
import { AI_MODELS, DEFAULT_MODEL_FOR, findAiModel, providerForModel, type AiModelProvider } from "@/config/ai-models";
import { ApiError } from "@/lib/api";

export type AiProviderId = "anthropic" | "openai" | "mock";

export const DEFAULT_MODELS: Record<AiModelProvider, string> = DEFAULT_MODEL_FOR;

export type AiCredentials = { provider: AiProviderId; model: string; apiKey: string | null; configured: boolean; mock: boolean };

const keyFor = (provider: AiModelProvider) => (provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY) ?? null;
const hasKey = (provider: AiModelProvider) => (provider === "anthropic" ? capabilities.anthropic : capabilities.openai);
const ENV_FOR: Record<AiModelProvider, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY" };

function isMock() {
  return process.env.AI_MOCK === "1" && process.env.NODE_ENV !== "production";
}

/**
 * Resolve which AI provider/model/key to use for a workspace.
 *
 * `requestedModel` is the model picked in the composer: it must be in the catalog
 * (src/config/ai-models.ts) and its provider's key must be set, or this throws a 400/503 the UI
 * shows as-is. Without one, the server default (AI_DEFAULT_MODEL, else Claude Opus 5.5) is used,
 * falling back to the other provider's default when only that key exists.
 */
export async function resolveAiCredentials(_workspaceId: string, requestedModel?: string | null): Promise<AiCredentials> {
  if (requestedModel) {
    const option = findAiModel(requestedModel);
    if (!option) throw new ApiError(400, `Unknown model "${requestedModel}".`, "unknown_model");
    if (isMock()) return { provider: "mock", model: option.id, apiKey: null, configured: true, mock: true };
    if (!hasKey(option.provider)) {
      throw new ApiError(503, `${option.label} needs ${ENV_FOR[option.provider]} on the server.`, "ai_model_not_configured", { missingEnv: [ENV_FOR[option.provider]] });
    }
    return { provider: option.provider, model: option.id, apiKey: keyFor(option.provider), configured: true, mock: false };
  }
  if (isMock()) return { provider: "mock", model: "mock-1", apiKey: null, configured: true, mock: true };
  const preferredModel = env.AI_DEFAULT_MODEL;
  const preferredProvider = providerForModel(preferredModel) ?? env.AI_DEFAULT_PROVIDER;
  if (hasKey(preferredProvider)) return { provider: preferredProvider, model: preferredModel, apiKey: keyFor(preferredProvider), configured: true, mock: false };
  const other: AiModelProvider = preferredProvider === "anthropic" ? "openai" : "anthropic";
  if (hasKey(other)) return { provider: other, model: DEFAULT_MODELS[other], apiKey: keyFor(other), configured: true, mock: false };
  return { provider: preferredProvider, model: preferredModel, apiKey: null, configured: false, mock: false };
}

export type AiModelAvailability = { id: string; label: string; provider: AiModelProvider; featured: boolean; note: string; available: boolean; missingEnv: string | null };

export type AiStatus = {
  configured: boolean;
  provider: AiProviderId;
  model: string;
  mock: boolean;
  /** Env vars that would enable AI when `configured` is false. */
  missingEnv: string[];
  /** Every pickable model and whether its provider key is set on this server. */
  models: AiModelAvailability[];
};

/** Public, secret-free description of the AI configuration for the UI. */
export async function getAiStatus(workspaceId: string): Promise<AiStatus> {
  const creds = await resolveAiCredentials(workspaceId);
  const mock = creds.mock;
  return {
    configured: creds.configured,
    provider: creds.provider,
    // In mock mode the default model is still the real default, so the picker shows something sensible.
    model: mock ? env.AI_DEFAULT_MODEL : creds.model,
    mock,
    missingEnv: creds.configured ? [] : ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"],
    models: AI_MODELS.map((m) => {
      const available = mock || hasKey(m.provider);
      return { ...m, available, missingEnv: available ? null : ENV_FOR[m.provider] };
    }),
  };
}

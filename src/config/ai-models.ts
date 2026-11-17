/**
 * The AI models a person can pick in the editor's composer. Client-safe (no secrets).
 *
 * Codexa offers three of its own modes, all running on Claude Sonnet 5.5 and differing in how much
 * the model thinks (the API's `effort` setting): Fast (low), Pro (high, Sonnet's default) and Max
 * (xhigh, with a larger output budget). The menu says which model powers them.
 */
export type AiModelProvider = "anthropic" | "openai";
export type AiEffort = "low" | "medium" | "high" | "xhigh" | "max";

export type AiModelOption = {
  /** Codexa's id for the mode (sent by the composer). */
  id: string;
  label: string;
  provider: AiModelProvider;
  /** The provider's model id actually called. */
  apiModel: string;
  effort: AiEffort;
  /** Output budget per model call. */
  maxTokens: number;
  /** Listed first in the picker. */
  featured: boolean;
  /** One short line shown under the name. */
  note: string;
};

export const POWERED_BY = "Claude Sonnet 5.5";

export const AI_MODELS: readonly AiModelOption[] = [
  { id: "codexa-fast", label: "Codexa Fast", provider: "anthropic", apiModel: "claude-sonnet-5-5", effort: "low", maxTokens: 16_000, featured: true, note: "Quick answers and small edits" },
  { id: "codexa-pro", label: "Codexa Pro", provider: "anthropic", apiModel: "claude-sonnet-5-5", effort: "high", maxTokens: 16_000, featured: true, note: "Balanced for building apps" },
  { id: "codexa-max", label: "Codexa Max", provider: "anthropic", apiModel: "claude-sonnet-5-5", effort: "xhigh", maxTokens: 32_000, featured: true, note: "Thinks hardest; slower, uses more tokens" },
];

/** The composer's default mode. */
export const DEFAULT_AI_MODEL = "codexa-pro";

/** Provider model used when nothing is picked and AI_DEFAULT_MODEL names another provider's model. */
export const DEFAULT_MODEL_FOR: Record<AiModelProvider, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-6-astra",
};

export function findAiModel(id: string | null | undefined): AiModelOption | undefined {
  return id ? AI_MODELS.find((m) => m.id === id) : undefined;
}

/** The provider for a provider model id, inferred from its family (for AI_DEFAULT_MODEL). */
export function providerForModel(id: string): AiModelProvider | null {
  const known = findAiModel(id);
  if (known) return known.provider;
  if (id.startsWith("claude")) return "anthropic";
  if (/^(gpt|o\d|chatgpt)/.test(id)) return "openai";
  return null;
}

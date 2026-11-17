/**
 * The AI models a person can pick in the editor's composer. Client-safe (no secrets): the server
 * decides which of these are usable from the configured provider keys (src/lib/ai/keys.ts).
 *
 * Model ids are the providers' own API ids. Featured models are listed first in the picker; the rest
 * sit under "More models".
 */
export type AiModelProvider = "anthropic" | "openai";

export type AiModelOption = {
  id: string;
  label: string;
  provider: AiModelProvider;
  /** Listed first in the picker. */
  featured: boolean;
  /** One short line shown under the name. */
  note: string;
};

export const AI_MODELS: readonly AiModelOption[] = [
  { id: "claude-fable-5-2", label: "Claude Fable 5.2", provider: "anthropic", featured: true, note: "Anthropic's most capable model; slower, higher cost" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", provider: "anthropic", featured: true, note: "Strong all-rounder for building apps" },
  { id: "gpt-6-astra", label: "GPT-6 Astra", provider: "openai", featured: true, note: "OpenAI's GPT-6 flagship" },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", provider: "openai", featured: true, note: "OpenAI GPT-6.1" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", provider: "anthropic", featured: false, note: "Faster everyday coding" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "anthropic", featured: false, note: "Fastest and lowest cost" },
];

/** Used when nothing is picked and AI_DEFAULT_MODEL is unset. */
export const DEFAULT_AI_MODEL = "claude-opus-5-5";

/** The default per provider, when the configured default belongs to a provider without a key. */
export const DEFAULT_MODEL_FOR: Record<AiModelProvider, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-6-astra",
};

export const PROVIDER_LABEL: Record<AiModelProvider, string> = { anthropic: "Claude", openai: "ChatGPT" };

export function findAiModel(id: string | null | undefined): AiModelOption | undefined {
  return id ? AI_MODELS.find((m) => m.id === id) : undefined;
}

/** The provider for a model id: the catalog's, else inferred from the id's family (for a custom AI_DEFAULT_MODEL). */
export function providerForModel(id: string): AiModelProvider | null {
  const known = findAiModel(id);
  if (known) return known.provider;
  if (id.startsWith("claude")) return "anthropic";
  if (/^(gpt|o\d|chatgpt)/.test(id)) return "openai";
  return null;
}

/** A display label for any model id (catalog label, else the id itself). */
export function modelLabel(id: string): string {
  return findAiModel(id)?.label ?? id;
}

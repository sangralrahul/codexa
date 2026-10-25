import "server-only";
import type { AiProvider } from "../provider";
import type { resolveAiCredentials } from "../keys";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAiProvider } from "./openai";
import { createMockProvider, isMockEnabled } from "./mock";

export type AiCredentials = Awaited<ReturnType<typeof resolveAiCredentials>>;

/** Build a provider from resolved credentials. Returns null when nothing is configured. */
export function createProvider(creds: AiCredentials): AiProvider | null {
  if (creds.mock) return isMockEnabled() ? createMockProvider() : null;
  if (!creds.configured || !creds.apiKey) return null;
  if (creds.provider === "anthropic") return createAnthropicProvider(creds.apiKey);
  if (creds.provider === "openai") return createOpenAiProvider(creds.apiKey);
  return null;
}

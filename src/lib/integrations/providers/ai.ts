import type { ProviderAdapter } from "../types";
import { httpProbe, statusMessage } from "./http";

const requireKey = (secret: Record<string, string>) => {
  if (!(secret.apiKey ?? "").trim()) throw new Error("API key is required");
};

export const openaiAdapter: ProviderAdapter = {
  id: "openai",
  validate: (_c, s) => requireKey(s),
  test: (_c, secret) =>
    httpProbe(
      "https://api.openai.com/v1/models",
      { headers: { Authorization: `Bearer ${secret.apiKey}` } },
      (status, body) => {
        if (status === 200) {
          const data = body && typeof body === "object" && Array.isArray((body as { data?: unknown[] }).data) ? (body as { data: unknown[] }).data : [];
          return { ok: true, message: `OpenAI key accepted (${data.length} models visible)`, details: { models: data.length } };
        }
        return { ok: false, message: statusMessage(status, "OpenAI") };
      },
    ),
};

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  validate: (_c, s) => requireKey(s),
  test: (_c, secret) =>
    httpProbe(
      "https://api.anthropic.com/v1/models?limit=100",
      { headers: { "x-api-key": secret.apiKey, "anthropic-version": "2023-06-01" } },
      (status, body) => {
        if (status === 200) {
          const data = body && typeof body === "object" && Array.isArray((body as { data?: unknown[] }).data) ? (body as { data: unknown[] }).data : [];
          return { ok: true, message: `Anthropic key accepted (${data.length} models visible)`, details: { models: data.length } };
        }
        return { ok: false, message: statusMessage(status, "Anthropic") };
      },
    ),
};

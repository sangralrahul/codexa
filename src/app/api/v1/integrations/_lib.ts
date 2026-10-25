import "server-only";
import { capabilities } from "@/lib/env";
import { INTEGRATIONS, type IntegrationDefinition } from "@/config/integrations";
import { getAdapter } from "@/lib/integrations/providers";

/** Whether the platform itself has credentials for a provider (env vars), independent of workspace connections. */
export function platformConfigured(id: string): boolean | null {
  switch (id) {
    case "github":
      return capabilities.github;
    case "openai":
      return capabilities.openai;
    case "anthropic":
      return capabilities.anthropic;
    case "stripe":
      return capabilities.stripe;
    case "razorpay":
      return capabilities.razorpay;
    case "resend":
      return capabilities.email;
    case "vercel":
      return capabilities.vercel;
    default:
      return null; // no platform-level configuration for this provider
  }
}

export type ProviderDto = Omit<IntegrationDefinition, "tags"> & {
  /** Platform-level env configuration (null when the provider is only configured per workspace). */
  configured: boolean | null;
  /** True when workspaces can store a connection for it (an adapter exists and it is available). */
  connectable: boolean;
  docsUrl: string;
};

export function listProviderDtos(): ProviderDto[] {
  return INTEGRATIONS.map(({ tags: _tags, ...def }) => ({
    ...def,
    configured: platformConfigured(def.id),
    connectable: def.status === "available" && Boolean(getAdapter(def.id)),
    docsUrl: def.docsPath,
  }));
}

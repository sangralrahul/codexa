import type { ProviderAdapter } from "../types";
import { postgresAdapter } from "./postgres";
import { supabaseAdapter } from "./supabase";
import { anthropicAdapter, openaiAdapter } from "./ai";
import { razorpayAdapter, resendAdapter, stripeAdapter, vercelAdapter } from "./misc";

export const PROVIDER_ADAPTERS: Record<string, ProviderAdapter> = {
  postgres: postgresAdapter,
  supabase: supabaseAdapter,
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  stripe: stripeAdapter,
  razorpay: razorpayAdapter,
  resend: resendAdapter,
  vercel: vercelAdapter,
};

export function getAdapter(provider: string): ProviderAdapter | undefined {
  return PROVIDER_ADAPTERS[provider];
}

/** Providers whose connections can be used by the database panel. */
export const DATABASE_PROVIDERS = new Set(["postgres", "supabase"]);

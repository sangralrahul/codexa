import { z } from "zod";
import { bindings } from "@/lib/cloudflare/bindings";

/**
 * Server-side environment configuration. Validated once at import time.
 * Optional integrations are detected with the `has*` helpers so the UI can
 * show accurate "not configured" states instead of pretending features work.
 */
/** APP_URL fallback: Vercel system variables when deployed there, else localhost. */
function defaultAppUrl() {
  const prod = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined;
  const host = prod || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default(defaultAppUrl()),
  SESSION_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(16),

  // Unset on platforms that cannot host the runner (e.g. Vercel): previews,
  // builds and Codexa hosting then report "not configured" instead of failing.
  RUNNER_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  RUNNER_TOKEN: z.string().min(1).default("dev-runner-token"),
  PREVIEW_HOST: z.string().default("preview.localhost:4100"),
  PREVIEW_PROTOCOL: z.enum(["http", "https"]).default("http"),
  DEPLOY_HOST: z.string().default("sites.localhost:4100"),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_DEFAULT_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
  AI_DEFAULT_MODEL: z.string().default("claude-sonnet-5-5"),

  RESEND_API_KEY: z.string().optional(),
  CUSTOMERIO_APP_API_KEY: z.string().optional(),
  CUSTOMERIO_REGION: z.enum(["us", "eu"]).default("us"),
  CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["customerio", "resend"]).optional().or(z.literal("").transform(() => undefined)),
  EMAIL_FROM: z.string().default("Codexa <no-reply@codexa.local>"),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  E2B_API_KEY: z.string().optional(),

  ADMIN_EMAILS: z.string().default(""),
  NEXT_PUBLIC_REALTIME_URL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${issues}\nSee .env.example for required variables.`);
  }
  return parsed.data;
}

export const env: Env = load();

/** Runner base URL, or null when no runner is configured for this deployment. */
export function runnerUrl(): string | null {
  if (env.RUNNER_URL) return env.RUNNER_URL;
  // Local development defaults to the runner started by `npm run runner:dev`.
  // Serverless hosts (Vercel, Cloudflare Workers) and production have no local runner.
  const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
  return process.env.VERCEL || onWorkers || env.NODE_ENV === "production" ? null : "http://127.0.0.1:4000";
}

const nonEmpty = (v?: string) => typeof v === "string" && v.trim().length > 0;

export const capabilities = {
  get anthropic() {
    return nonEmpty(env.ANTHROPIC_API_KEY);
  },
  get openai() {
    return nonEmpty(env.OPENAI_API_KEY);
  },
  get ai() {
    return nonEmpty(env.ANTHROPIC_API_KEY) || nonEmpty(env.OPENAI_API_KEY);
  },
  /** Codexa's own account emails can be delivered (Customer.io or Resend). */
  get email() {
    return nonEmpty(env.CUSTOMERIO_APP_API_KEY) || nonEmpty(env.RESEND_API_KEY);
  },
  get customerio() {
    return nonEmpty(env.CUSTOMERIO_APP_API_KEY);
  },
  get resend() {
    return nonEmpty(env.RESEND_API_KEY);
  },
  get github() {
    return nonEmpty(env.GITHUB_CLIENT_ID) && nonEmpty(env.GITHUB_CLIENT_SECRET);
  },
  get stripe() {
    return nonEmpty(env.STRIPE_SECRET_KEY);
  },
  get razorpay() {
    return nonEmpty(env.RAZORPAY_KEY_ID) && nonEmpty(env.RAZORPAY_KEY_SECRET);
  },
  get vercel() {
    return nonEmpty(env.VERCEL_TOKEN);
  },
  /** Previews, builds and Codexa hosting: a runner service (RUNNER_URL) or Cloudflare Containers (SANDBOX binding). */
  get runner() {
    return runnerUrl() !== null || Boolean(bindings().SANDBOX);
  },
  get e2b() {
    return nonEmpty(env.E2B_API_KEY);
  },
};

export const adminEmails = () =>
  env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

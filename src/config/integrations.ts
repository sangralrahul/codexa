/**
 * Integrations directory — shared, stable data.
 *
 * Consumed by:
 *  - the public /integrations marketing pages (another owner)
 *  - the search index (src/lib/content/search.ts reads `INTEGRATIONS`)
 *  - GET /api/v1/integrations and the workspace connection forms
 *
 * Keep the shape stable: { id, name, category, description, status, configFields, docsPath, capabilities }.
 * Secrets are always declared as `type: "password"` fields; the API never returns their values.
 */
export type IntegrationCategory =
  | "databases"
  | "authentication"
  | "ai"
  | "payments"
  | "email"
  | "analytics"
  | "storage"
  | "hosting"
  | "git"
  | "productivity";

export type IntegrationFieldType = "text" | "password" | "url";

export type IntegrationConfigField = {
  key: string;
  label: string;
  type: IntegrationFieldType;
  required: boolean;
  placeholder: string;
};

export type IntegrationDefinition = {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: "available" | "planned";
  configFields: IntegrationConfigField[];
  docsPath: string;
  capabilities: string[];
  /** Optional free-form tags used by search. */
  tags?: string[];
};

export const INTEGRATION_CATEGORIES: { id: IntegrationCategory; name: string; description: string }[] = [
  { id: "databases", name: "Databases", description: "Connect, inspect and query your data" },
  { id: "authentication", name: "Authentication", description: "Sign-in providers for generated apps" },
  { id: "ai", name: "AI providers", description: "Bring your own model keys" },
  { id: "payments", name: "Payments", description: "Checkout and subscriptions" },
  { id: "email", name: "Email", description: "Transactional email delivery" },
  { id: "analytics", name: "Analytics", description: "Product and web analytics" },
  { id: "storage", name: "Storage", description: "Files and object storage" },
  { id: "hosting", name: "Hosting", description: "Deployment targets" },
  { id: "git", name: "Git", description: "Source control" },
  { id: "productivity", name: "Productivity", description: "Team tools" },
];

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    category: "git",
    description: "Import repositories, commit and push changes, and keep projects in sync with a branch.",
    status: "available",
    configFields: [],
    docsPath: "/docs/github",
    capabilities: ["oauth", "import", "push", "status"],
    tags: ["git", "repository", "oauth", "import"],
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "databases",
    description: "Connect any PostgreSQL database: browse the schema and run queries from the workspace.",
    status: "available",
    configFields: [
      { key: "connectionString", label: "Connection string", type: "password", required: true, placeholder: "postgres://user:password@host:5432/dbname" },
      { key: "ssl", label: "SSL (true/false)", type: "text", required: false, placeholder: "true" },
    ],
    docsPath: "/docs/integrations#postgresql",
    capabilities: ["schema", "query", "test"],
    tags: ["sql", "database", "postgres", "neon", "rds"],
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "databases",
    description: "Postgres with auth, storage and realtime. Connect the database and the REST endpoint.",
    status: "available",
    configFields: [
      { key: "projectUrl", label: "Project URL", type: "url", required: true, placeholder: "https://xyzcompany.supabase.co" },
      { key: "anonKey", label: "Anon (public) key", type: "text", required: true, placeholder: "eyJhbGciOi..." },
      { key: "connectionString", label: "Database connection string", type: "password", required: true, placeholder: "postgresql://postgres:[password]@db.xyz.supabase.co:5432/postgres" },
    ],
    docsPath: "/docs/integrations#supabase",
    capabilities: ["schema", "query", "test", "rest"],
    tags: ["postgres", "auth", "storage", "baas"],
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "ai",
    description: "Use your own OpenAI API key for generation in this workspace.",
    status: "available",
    configFields: [{ key: "apiKey", label: "API key", type: "password", required: true, placeholder: "sk-..." }],
    docsPath: "/docs/integrations#openai",
    capabilities: ["test", "byok"],
    tags: ["gpt", "llm", "ai"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    category: "ai",
    description: "Use your own Anthropic API key (Claude) for generation in this workspace.",
    status: "available",
    configFields: [{ key: "apiKey", label: "API key", type: "password", required: true, placeholder: "sk-ant-..." }],
    docsPath: "/docs/integrations#anthropic",
    capabilities: ["test", "byok"],
    tags: ["claude", "llm", "ai"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Accept payments in generated apps with your Stripe account.",
    status: "available",
    configFields: [
      { key: "secretKey", label: "Secret key", type: "password", required: true, placeholder: "sk_live_... or sk_test_..." },
      { key: "publishableKey", label: "Publishable key", type: "text", required: false, placeholder: "pk_..." },
    ],
    docsPath: "/docs/integrations#stripe",
    capabilities: ["test"],
    tags: ["payments", "checkout", "subscriptions"],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "payments",
    description: "Payments for India (UPI, cards, net banking) with your Razorpay account.",
    status: "available",
    configFields: [
      { key: "keyId", label: "Key ID", type: "text", required: true, placeholder: "rzp_live_..." },
      { key: "keySecret", label: "Key secret", type: "password", required: true, placeholder: "" },
    ],
    docsPath: "/docs/integrations#razorpay",
    capabilities: ["test"],
    tags: ["payments", "upi", "india"],
  },
  {
    id: "resend",
    name: "Resend",
    category: "email",
    description: "Transactional email for generated apps.",
    status: "available",
    configFields: [{ key: "apiKey", label: "API key", type: "password", required: true, placeholder: "re_..." }],
    docsPath: "/docs/integrations#resend",
    capabilities: ["test"],
    tags: ["email", "smtp", "transactional"],
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "hosting",
    description: "Deploy projects to your own Vercel account.",
    status: "available",
    configFields: [
      { key: "token", label: "Access token", type: "password", required: true, placeholder: "" },
      { key: "teamId", label: "Team ID", type: "text", required: false, placeholder: "team_..." },
    ],
    docsPath: "/docs/integrations#vercel",
    capabilities: ["test", "deploy"],
    tags: ["hosting", "deploy", "edge"],
  },
  {
    id: "clerk",
    name: "Clerk",
    category: "authentication",
    description: "Drop-in authentication and user management for generated apps.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#authentication",
    capabilities: [],
    tags: ["auth", "users"],
  },
  {
    id: "auth0",
    name: "Auth0",
    category: "authentication",
    description: "Enterprise identity with social and SSO logins.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#authentication",
    capabilities: [],
    tags: ["auth", "sso"],
  },
  {
    id: "s3",
    name: "Amazon S3",
    category: "storage",
    description: "Object storage for uploads and assets.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#storage",
    capabilities: [],
    tags: ["files", "uploads", "aws"],
  },
  {
    id: "posthog",
    name: "PostHog",
    category: "analytics",
    description: "Product analytics, session replay and feature flags.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#analytics",
    capabilities: [],
    tags: ["analytics", "events"],
  },
  {
    id: "plausible",
    name: "Plausible",
    category: "analytics",
    description: "Privacy-friendly web analytics.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#analytics",
    capabilities: [],
    tags: ["analytics", "privacy"],
  },
  {
    id: "netlify",
    name: "Netlify",
    category: "hosting",
    description: "Static and serverless hosting.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#hosting",
    capabilities: [],
    tags: ["hosting", "deploy"],
  },
  {
    id: "slack",
    name: "Slack",
    category: "productivity",
    description: "Deployment and activity notifications in your channels.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#productivity",
    capabilities: [],
    tags: ["notifications", "chat"],
  },
  {
    id: "linear",
    name: "Linear",
    category: "productivity",
    description: "Turn issues into prompts and link generations to tickets.",
    status: "planned",
    configFields: [],
    docsPath: "/docs/integrations#productivity",
    capabilities: [],
    tags: ["issues", "project management"],
  },
];

export const INTEGRATION_IDS = INTEGRATIONS.map((i) => i.id);

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}

/** Providers that can be stored as workspace connections (have config fields and are available). */
export function connectableIntegrations(): IntegrationDefinition[] {
  return INTEGRATIONS.filter((i) => i.status === "available" && i.configFields.length > 0);
}

export function secretFieldKeys(def: IntegrationDefinition): string[] {
  return def.configFields.filter((f) => f.type === "password").map((f) => f.key);
}

export default INTEGRATIONS;

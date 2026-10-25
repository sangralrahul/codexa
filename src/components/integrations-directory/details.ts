/**
 * Human-readable detail copy for the public /integrations/[id] pages.
 *
 * Everything here must stay accurate to what the codebase actually supports
 * (src/lib/integrations/providers/*, src/lib/github, src/lib/deploy). Planned
 * integrations have no adapter; their copy says so and never promises a date.
 */
export type IntegrationDetail = {
  /** What connecting this integration lets you do inside Codexa today. */
  enables: string[];
  /** Ordered setup steps shown to the reader. */
  setup: string[];
  /** Permissions, scopes or key types the integration needs. */
  permissions: string[];
  /** Known limitations of the current implementation. */
  limitations: string[];
  /** True when the operator (not a workspace) configures it through environment variables. */
  operatorConfigured?: boolean;
};

const CAPABILITY_LABELS: Record<string, string> = {
  oauth: "Sign in with the provider (OAuth)",
  import: "Import a repository into a project",
  push: "Commit and push project files to a branch",
  status: "Show sync status (linked repository, branch, last push)",
  schema: "Browse tables and columns in the schema browser",
  query: "Run SQL from the workspace, with confirmation for destructive statements",
  test: "Test the connection from workspace settings before saving",
  rest: "Use the project's REST endpoint and anon key in generated apps",
  byok: "Bring your own API key for this workspace's AI runs",
  deploy: "Deploy a project to the provider from the Deploy panel",
};

export function capabilityLabel(c: string) {
  return CAPABILITY_LABELS[c] ?? c;
}

const WORKSPACE_CONNECTION_STEPS = [
  "Open Settings → Integrations in your workspace (requires the admin or owner role).",
  "Choose the provider, give the connection a name, and fill in the fields listed above. Secret fields are encrypted before they are stored and are never sent back to the browser.",
  "Click Test connection. Codexa makes a single read-only request to the provider to confirm the credentials work.",
  "Save. The connection is now available to projects in this workspace.",
];

const DETAILS: Record<string, IntegrationDetail> = {
  github: {
    operatorConfigured: true,
    enables: [
      "Sign in to Codexa with your GitHub account (when the operator has configured the OAuth app).",
      "Import an existing repository into a new project, with the branch of your choice.",
      "Commit and push the project's files to a branch from the editor, with a commit message.",
      "See the linked repository, branch and last push in the project's GitHub status panel.",
    ],
    setup: [
      "The Codexa operator registers a GitHub OAuth app and sets GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on the server. Until then the GitHub buttons render a 'not configured' state.",
      "In your account, choose Connect GitHub. You are redirected to GitHub to approve the requested scopes.",
      "Create a project with Import from GitHub, or link a repository from an existing project's GitHub panel.",
    ],
    permissions: [
      "OAuth scopes requested: repo (read and write access to repositories you choose to import or push to), read:user and user:email (to identify your account).",
      "The access token is encrypted at rest and only used server-side.",
    ],
    limitations: [
      "Push is a full-tree commit of the project's files; there is no merge or conflict resolution. Pull a fresh copy by re-importing.",
      "GitHub Apps with fine-grained permissions are not supported yet; the classic OAuth flow is used.",
      "Webhooks (automatic sync when the repository changes) are not implemented.",
    ],
  },
  postgres: {
    enables: [
      "Connect any PostgreSQL database (self-hosted, Neon, RDS, Railway and similar) to a workspace.",
      "Browse schemas, tables and columns from the project's Database panel.",
      "Run SQL queries and see rows, fields and row counts. Destructive statements (DROP, DELETE without WHERE, TRUNCATE, ALTER…) require an explicit confirmation.",
    ],
    setup: WORKSPACE_CONNECTION_STEPS,
    permissions: [
      "A database user with the privileges you want Codexa to have. For read-only exploration, create a user with SELECT only.",
      "Network access from the Codexa server to the database host (allow-list the server's IP if your provider requires it).",
    ],
    limitations: [
      "Queries run from the Codexa server with a timeout; long-running or streaming queries are not supported.",
      "Connections are workspace-level: every project in the workspace can use them.",
      "Generated apps do not receive the connection string automatically; add it as a project environment variable when needed.",
    ],
  },
  supabase: {
    enables: [
      "Use the Supabase Postgres database with the same schema browser and SQL runner as the PostgreSQL integration.",
      "Keep the project URL and anon key alongside the database so generated apps can be configured consistently.",
    ],
    setup: WORKSPACE_CONNECTION_STEPS,
    permissions: [
      "The database connection string from Supabase → Project settings → Database.",
      "The anon (public) key. The service role key is not required and should not be pasted into Codexa.",
    ],
    limitations: [
      "Supabase Auth, Storage and Realtime are not integrated; only the Postgres database and the REST endpoint details are used.",
      "Row Level Security policies are not managed by Codexa; manage them in the Supabase dashboard or with SQL.",
    ],
  },
  openai: {
    enables: [
      "Store your own OpenAI API key encrypted in the workspace and test it from workspace settings before saving.",
      "Prepare the workspace for bring-your-own-key AI runs with OpenAI models (billed to your OpenAI account).",
    ],
    setup: [
      ...WORKSPACE_CONNECTION_STEPS,
      "Today the AI agent runs with the operator-level OPENAI_API_KEY or ANTHROPIC_API_KEY; routing runs through a workspace key is being wired up and is not active yet. When no key is configured at all, the AI panel shows a 'not configured' state.",
    ],
    permissions: ["An OpenAI API key with access to the chat completions API. Keys are encrypted at rest and never returned to the browser."],
    limitations: [
      "Usage limits from your Codexa plan (requests and tokens) apply to every AI run, including runs with your own key once that routing is active.",
      "Fine-tuned models and assistants/threads APIs are not supported.",
    ],
  },
  anthropic: {
    enables: [
      "Store your own Anthropic API key encrypted in the workspace and test it from workspace settings before saving.",
      "Prepare the workspace for bring-your-own-key AI runs with Claude models (billed to your Anthropic account).",
    ],
    setup: [
      ...WORKSPACE_CONNECTION_STEPS,
      "Today the AI agent runs with the operator-level ANTHROPIC_API_KEY or OPENAI_API_KEY; routing runs through a workspace key is being wired up and is not active yet. When no key is configured at all, the AI panel shows a 'not configured' state.",
    ],
    permissions: ["An Anthropic API key with access to the Messages API. Keys are encrypted at rest and never returned to the browser."],
    limitations: ["Usage limits from your Codexa plan (requests and tokens) apply to every AI run, including runs with your own key once that routing is active.", "Batch and files APIs are not used."],
  },
  stripe: {
    enables: [
      "Store your Stripe secret key (and optional publishable key) encrypted in the workspace, with a connection test against the Stripe API.",
      "Keep the team's Stripe credentials in one place; copy them into project environment variables when a generated app needs Stripe Checkout or webhooks.",
    ],
    setup: WORKSPACE_CONNECTION_STEPS,
    permissions: [
      "A secret key (sk_test_… or sk_live_…) or a restricted key (rk_…). For the connection test a key with read access to the balance is enough.",
    ],
    limitations: [
      "This connection is separate from Codexa's own billing: paying for a Codexa plan does not require it.",
      "Codexa does not create products, prices or webhooks for you; the generated code does that against your account.",
      "Secrets are not injected into running sandboxes automatically; add them as project environment variables.",
    ],
  },
  razorpay: {
    enables: [
      "Store your Razorpay key ID and key secret encrypted in the workspace, with a connection test against the Razorpay API.",
      "Keep the team's Razorpay credentials in one place; copy them into project environment variables when a generated app needs Razorpay Checkout (UPI, cards, net banking).",
    ],
    setup: WORKSPACE_CONNECTION_STEPS,
    permissions: ["A Razorpay key ID and key secret from Settings → API keys in the Razorpay dashboard (test or live mode)."],
    limitations: [
      "This connection is separate from Codexa's own billing.",
      "Codexa does not create plans, orders or webhooks for you; the generated code does that against your account.",
      "Secrets are not injected into running sandboxes automatically; add them as project environment variables.",
    ],
  },
  resend: {
    enables: [
      "Store a Resend API key encrypted in the workspace, with a connection test.",
      "Keep the team's Resend credentials in one place; copy them into project environment variables when a generated app sends transactional email.",
    ],
    setup: WORKSPACE_CONNECTION_STEPS,
    permissions: ["A Resend API key (re_…). A sending-only key is sufficient.", "A verified sending domain in Resend for production email."],
    limitations: [
      "Codexa's own account emails are sent with the operator-level RESEND_API_KEY, not with workspace connections.",
      "Templates and audiences are not managed by Codexa.",
    ],
  },
  vercel: {
    enables: [
      "Deploy a project to your own Vercel account from the Deploy panel, as an alternative to Codexa static hosting.",
      "View deployment history and roll back by re-pointing the alias to a previous deployment.",
    ],
    setup: [
      ...WORKSPACE_CONNECTION_STEPS,
      "In a project, open Deploy, choose Vercel as the target and start a deployment. Build output comes from the sandbox build step.",
    ],
    permissions: ["A Vercel access token (Account settings → Tokens). Add the team ID if the project should live in a team scope.", "The token needs permission to create projects and deployments in that scope."],
    limitations: [
      "The adapter is implemented against the public Vercel API but has only been exercised with a real token in limited environments; treat the first deployment as a smoke test.",
      "Environment variables and custom domains on Vercel are managed in the Vercel dashboard, not from Codexa.",
      "Serverless functions are not deployed; only the static build output is uploaded.",
    ],
  },
};

const PLANNED_DEFAULT: IntegrationDetail = {
  enables: [],
  setup: [],
  permissions: [],
  limitations: ["No adapter exists in Codexa yet. Nothing can be connected, tested or used until the integration ships."],
};

export function getIntegrationDetail(id: string): IntegrationDetail {
  return DETAILS[id] ?? PLANNED_DEFAULT;
}

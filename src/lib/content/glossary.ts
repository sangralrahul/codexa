/**
 * Glossary of terms used across Codexa. Pure data: safe to import from
 * client and server code. Terms link to the page that explains them.
 */
export type GlossaryTerm = { term: string; slug: string; definition: string; href?: string; tags?: string[] };

const t = (term: string, definition: string, href?: string, tags: string[] = []): GlossaryTerm => ({
  term,
  slug: term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
  definition,
  href,
  tags,
});

export const GLOSSARY: GlossaryTerm[] = [
  t("Activity history", "A per-project log of notable events (file saves, snapshots, AI runs, deployments) with the actor and timestamp. Shown in the project's Activity tab.", "/docs/projects", ["projects"]),
  t("Agent", "The Codexa AI agent: a bounded, tool-using loop that plans, reads and edits project files, runs checks in the sandbox and repairs errors. It never runs code inside the web server.", "/docs/ai-agent", ["ai"]),
  t("Ask mode", "An AI mode that answers questions about your project without editing any files. Useful for understanding code or planning a change before committing to it.", "/docs/ai-agent", ["ai"]),
  t("Build mode", "The default AI mode. The agent plans, creates and edits files, then validates the result with type-check, build or tests in the sandbox.", "/docs/ai-agent", ["ai"]),
  t("Checkpoint", "Another name for a snapshot: a named, immutable copy of every file in a project that can be diffed against the current state and restored in one click.", "/docs/projects", ["projects"]),
  t("CNAME record", "A DNS record that points your domain (for example app.example.com) at a Codexa deployment host. Custom domains are set up with a CNAME; automated verification is on the roadmap.", "/docs/custom-domains", ["deployment"]),
  t("Codexa hosting", "The built-in static hosting provider. A deployment builds the project in a sandbox and serves the output directory at a Codexa subdomain, with history and rollback.", "/docs/deployment", ["deployment"]),
  t("Confirmation required", "The confirmation_required error returned by the SQL runner when a statement would modify or drop data. Re-send the query with confirmDestructive: true to run it.", "/docs/databases", ["databases", "errors"]),
  t("Connection", "A workspace-level integration record (PostgreSQL, Supabase, OpenAI, Anthropic, Stripe, Razorpay, Resend, Vercel). Secrets are encrypted at rest and never returned to the browser.", "/docs/integrations", ["integrations"]),
  t("Conversation", "A thread of messages between you and the AI agent inside a project. Each generation run belongs to a conversation.", "/docs/ai-agent", ["ai"]),
  t("Custom domain", "Your own domain served in front of a Codexa deployment. Plans include a number of custom domains; configure them with a CNAME record.", "/docs/custom-domains", ["deployment"]),
  t("Deployment", "A build of a project at a point in time, published to Codexa hosting or Vercel. Deployments have a status (queued, building, deploying, live, failed, rolled_back), a build log and a URL.", "/docs/deployment", ["deployment"]),
  t("Diagnostics", "Type and syntax problems reported by the editor for the open file, shown inline and in the problems list.", "/docs/editor", ["editor"]),
  t("Diff view", "A side-by-side or inline comparison of two versions of a file, used to review snapshot differences and the changes made by an AI run before keeping or reverting them.", "/docs/editor", ["editor", "projects"]),
  t("Environment variable", "A named value (often a secret) made available to a project's preview and deployment. Values are encrypted with the platform key before storage and masked in the UI by default.", "/docs/environment-variables", ["projects"]),
  t("Fix mode", "An AI mode focused on a reported error: the agent reads the failing output, locates the cause and applies a targeted repair.", "/docs/ai-agent", ["ai"]),
  t("Framework", "The project type that decides how it is installed, run and built: vite-react, static or node-express today. Next.js projects are on the roadmap.", "/docs/projects", ["projects"]),
  t("Generation run", "One execution of the AI agent for a prompt. A run records its stage, plan, changed files, token usage, repair attempts and the snapshot taken before it started.", "/docs/ai-agent", ["ai"]),
  t("Idempotent webhook", "A webhook handler that produces the same result no matter how many times the same event is delivered. Codexa records every billing event id in webhook_events and skips duplicates.", "/api/webhooks", ["billing", "api"]),
  t("Import from GitHub", "Creating a project from an existing repository and branch through the GitHub integration. Files are copied into Codexa's database; the repository is remembered for later pushes.", "/docs/github", ["github"]),
  t("Live preview", "A running instance of your project inside a sandbox, proxied to a per-session preview URL and shown in the workspace with viewport controls.", "/docs/projects", ["runtime"]),
  t("Monaco", "The open-source editor component that powers the Codexa code editor (the same core as Visual Studio Code). Codexa serves it from its own origin rather than a CDN.", "/docs/editor", ["editor"]),
  t("Personal workspace", "The workspace created automatically for every account. It has a single member (you) and holds projects that are not shared with a team.", "/docs/getting-started", ["workspaces"]),
  t("Plan", "A pricing tier (Free, Pro, Team, Enterprise) that sets a workspace's usage limits. Limits are enforced on the server, not only displayed.", "/docs/billing", ["billing"]),
  t("Presence", "Realtime information about who is viewing which file in a project, delivered over WebSockets. Presence is shipped; concurrent editing is not.", "/docs/projects", ["collaboration"]),
  t("Preview proxy", "The host-based proxy in the runner service that routes a preview URL to the right sandbox port and attaches logs.", "/docs/security", ["runtime"]),
  t("Project", "The unit of work in Codexa: a set of files, settings, environment variables, snapshots, conversations, runtime sessions and deployments inside a workspace.", "/docs/projects", ["projects"]),
  t("Quota", "The portion of a plan limit you have used this billing period (AI requests and tokens, runtime minutes, deployments, storage, projects, members). Exceeding it returns quota_exceeded.", "/docs/billing", ["billing", "errors"]),
  t("Rate limit", "A cap on how many requests an IP or account can make to an endpoint in a time window. Exceeding it returns HTTP 429 with code rate_limited and a Retry-After header.", "/api", ["api", "errors"]),
  t("Repair loop", "After the agent edits files it runs a validation command; if that fails it reads the error output and tries a targeted fix, at most twice, before reporting the remaining error to you.", "/docs/ai-agent", ["ai"]),
  t("Revert", "Restoring a project to the snapshot that was taken before an AI run, discarding every change the run made.", "/docs/ai-agent", ["ai", "projects"]),
  t("Role", "A member's permission level in a workspace: owner, admin, editor or viewer. Roles are checked on the server for every request.", "/docs/getting-started", ["workspaces"]),
  t("Rollback", "Making a previous successful deployment live again without rebuilding.", "/docs/deployment", ["deployment"]),
  t("Runner", "The separate service that executes project code in sandboxes, exposes allowlisted commands (install, build, test, typecheck, lint), streams logs and serves previews and static deployments.", "/docs/security", ["runtime"]),
  t("Runtime session", "A single running sandbox for a project, with a status (starting, running, stopped, error), a preview URL and a heartbeat. Runtime minutes count against your plan.", "/docs/projects", ["runtime"]),
  t("Sandbox", "An isolated environment for running project code: an unprivileged user, Linux namespaces, cgroup memory and process limits, and timeouts. Docker and E2B drivers are also available.", "/docs/security", ["runtime"]),
  t("Session", "A signed-in browser session, stored as an httpOnly cookie whose token is hashed before it is saved. Sessions are what authenticate API requests today.", "/api/authentication", ["auth", "api"]),
  t("Share link", "A tokenized URL that grants view or edit access to a project without a workspace membership. Links can expire and can be revoked.", "/docs/projects", ["projects"]),
  t("Snapshot", "A named, immutable copy of every file in a project. Codexa takes one automatically before each AI run and before deployments; you can create them manually at any time.", "/docs/projects", ["projects"]),
  t("SSE (server-sent events)", "The streaming format used by the generation endpoint and runtime logs: a long-lived HTTP response that emits named events as they happen.", "/api/generations", ["api"]),
  t("Template", "A starter project with real files and documented dependencies (React + Vite, static site, Node + Express). Every new project begins from a template or a GitHub import.", "/templates", ["projects"]),
  t("Token (AI)", "The unit AI providers bill by. Codexa records input and output tokens for every run and enforces the plan's monthly token limit.", "/docs/billing", ["ai", "billing"]),
  t("Workspace", "The container for projects, members, integrations, usage and billing. Every user has a personal workspace and may belong to team workspaces.", "/docs/getting-started", ["workspaces"]),
];

export function getGlossaryTerm(slug: string) {
  return GLOSSARY.find((g) => g.slug === slug);
}

export function groupGlossaryByLetter(): { letter: string; terms: GlossaryTerm[] }[] {
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of GLOSSARY.slice().sort((a, b) => a.term.localeCompare(b.term))) {
    const letter = term.term[0].toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }
  return [...groups.entries()].map(([letter, terms]) => ({ letter, terms }));
}

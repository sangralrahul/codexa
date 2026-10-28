import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = { enumValues: ["user", "staff", "admin"] as const };
export const workspaceRoleEnum = { enumValues: ["owner", "admin", "editor", "viewer"] as const };
export const planEnum = { enumValues: ["free", "pro", "team", "enterprise"] as const };
export const currencyEnum = { enumValues: ["INR", "USD"] as const };
export const projectVisibilityEnum = { enumValues: ["private", "unlisted", "public"] as const };
export const authTokenTypeEnum = { enumValues: ["verify_email", "reset_password", "invite"] as const };
export const generationStatusEnum = { enumValues: [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const };
export const runtimeStatusEnum = { enumValues: ["starting", "running", "stopped", "error"] as const };
export const deploymentStatusEnum = { enumValues: [
  "queued",
  "building",
  "deploying",
  "live",
  "failed",
  "rolled_back",
] as const };
export const subscriptionStatusEnum = { enumValues: [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
] as const };
export const billingIntervalEnum = { enumValues: ["month", "year"] as const };
export const jobStatusEnum = { enumValues: ["queued", "running", "succeeded", "failed", "cancelled"] as const };
export const ticketStatusEnum = { enumValues: ["open", "in_progress", "closed"] as const };
export const emailStatusEnum = { enumValues: ["queued", "sent", "failed"] as const };

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () => ts("created_at").notNull().$defaultFn(() => new Date());
const updatedAt = () => ts("updated_at").notNull().$defaultFn(() => new Date());

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------
export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    emailVerifiedAt: ts("email_verified_at"),
    passwordHash: text("password_hash"),
    name: text("name").notNull().default(""),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: userRoleEnum.enumValues }).notNull().default("user"),
    locale: text("locale").notNull().default("en"),
    timezone: text("timezone").notNull().default("UTC"),
    onboardedAt: ts("onboarded_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: authTokenTypeEnum.enumValues }).notNull(),
    tokenHash: text("token_hash").notNull(),
    email: text("email"),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_idx").on(t.tokenHash)],
);

export const oauthAccounts = sqliteTable(
  "oauth_accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // github
    providerAccountId: text("provider_account_id").notNull(),
    username: text("username"),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("oauth_provider_account_idx").on(t.provider, t.providerAccountId)],
);

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------
export const workspaces = sqliteTable(
  "workspaces",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    plan: text("plan", { enum: planEnum.enumValues }).notNull().default("free"),
    billingCurrency: text("billing_currency", { enum: currencyEnum.enumValues }).notNull().default("USD"),
    settings: text("settings", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("workspaces_slug_idx").on(t.slug)],
);

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: workspaceRoleEnum.enumValues }).notNull().default("editor"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("wm_user_idx").on(t.userId)],
);

export const workspaceInvites = sqliteTable(
  "workspace_invites",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: workspaceRoleEnum.enumValues }).notNull().default("editor"),
    tokenHash: text("token_hash").notNull(),
    invitedBy: text("invited_by").references(() => users.id),
    expiresAt: ts("expires_at").notNull(),
    acceptedAt: ts("accepted_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invites_token_idx").on(t.tokenHash), index("invites_ws_idx").on(t.workspaceId)],
);

// ---------------------------------------------------------------------------
// Projects & files
// ---------------------------------------------------------------------------
export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    templateId: text("template_id"),
    framework: text("framework").notNull().default("vite-react"), // vite-react | static | node-express | nextjs
    visibility: text("visibility", { enum: projectVisibilityEnum.enumValues }).notNull().default("private"),
    createdBy: text("created_by").references(() => users.id),
    settings: text("settings", { mode: "json" }).$type<ProjectSettings>().notNull().$defaultFn(() => ({})),
    githubRepo: text("github_repo"), // owner/name
    githubBranch: text("github_branch"),
    lastOpenedAt: ts("last_opened_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("projects_ws_slug_idx").on(t.workspaceId, t.slug), index("projects_ws_idx").on(t.workspaceId)],
);

export type ProjectSettings = {
  devCommand?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDir?: string;
  port?: number;
  nodeVersion?: string;
  /** Server-managed GitHub sync state. */
  githubLastTreeSha?: string;
  githubLastCommitSha?: string;
  githubLastSyncAt?: string;
  /** Project knowledge: rules and facts the AI follows on every request in this project (owner-written). */
  knowledge?: string;
  /** Publishing: the chosen site name (the <name> in <name>.<DEPLOY_HOST>); default is <workspace>-<project>. */
  siteName?: string;
};

export const projectFiles = sqliteTable(
  "project_files",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull().default(""),
    isBinary: integer("is_binary", { mode: "boolean" }).notNull().default(false),
    size: integer("size").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("project_files_path_idx").on(t.projectId, t.path)],
);

export const projectSnapshots = sqliteTable(
  "project_snapshots",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("manual"), // manual | auto | ai | deploy | restore
    message: text("message"),
    // File contents live in R2 (D1 rows are capped at 2 MB); see src/lib/storage.
    storageKey: text("storage_key").notNull(),
    fileCount: integer("file_count").notNull().default(0),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("snapshots_project_idx").on(t.projectId, t.createdAt)],
);

export const projectEnvVars = sqliteTable(
  "project_env_vars",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueEnc: text("value_enc").notNull(),
    isSecret: integer("is_secret", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("env_project_key_idx").on(t.projectId, t.key)],
);

export const projectActivity = sqliteTable(
  "project_activity",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    createdAt: createdAt(),
  },
  (t) => [index("activity_project_idx").on(t.projectId, t.createdAt)],
);

export const shareLinks = sqliteTable(
  "share_links",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    access: text("access").notNull().default("view"), // view | edit
    expiresAt: ts("expires_at"),
    createdBy: text("created_by").references(() => users.id),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("share_links_token_idx").on(t.tokenHash)],
);

// ---------------------------------------------------------------------------
// AI conversations & generation runs
// ---------------------------------------------------------------------------
export const conversations = sqliteTable(
  "conversations",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("conversations_project_idx").on(t.projectId)],
);

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "plan"; steps: string[]; /** Plan mode: waiting for the user to approve before anything is built. */ approval?: "pending" }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; output: string; isError?: boolean }
  | { type: "file_change"; path: string; action: "create" | "update" | "delete"; summary?: string }
  | { type: "stage"; stage: string; detail?: string }
  | { type: "error"; message: string }
  /** An image the user attached to the prompt; the bytes live in R2 under attachments/<projectId>/<file>. */
  | { type: "image"; file: string; mediaType: string; name: string; width?: number; height?: number };

export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | system
    content: text("content").notNull().default(""),
    parts: text("parts", { mode: "json" }).$type<MessagePart[]>().notNull().$defaultFn(() => []),
    model: text("model"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const generationRuns = sqliteTable(
  "generation_runs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id),
    status: text("status", { enum: generationStatusEnum.enumValues }).notNull().default("queued"),
    stage: text("stage").notNull().default("queued"),
    provider: text("provider"),
    model: text("model"),
    plan: text("plan", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
    changedFiles: text("changed_files", { mode: "json" }).$type<{ path: string; action: string }[]>().notNull().$defaultFn(() => []),
    snapshotBeforeId: text("snapshot_before_id"),
    error: text("error"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    repairAttempts: integer("repair_attempts").notNull().default(0),
    startedAt: ts("started_at"),
    finishedAt: ts("finished_at"),
    createdAt: createdAt(),
  },
  (t) => [index("runs_project_idx").on(t.projectId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Runtime sessions & deployments
// ---------------------------------------------------------------------------
export const runtimeSessions = sqliteTable(
  "runtime_sessions",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    runnerSessionId: text("runner_session_id"),
    status: text("status", { enum: runtimeStatusEnum.enumValues }).notNull().default("starting"),
    previewUrl: text("preview_url"),
    previewToken: text("preview_token"),
    error: text("error"),
    startedBy: text("started_by").references(() => users.id),
    startedAt: ts("started_at").notNull().$defaultFn(() => new Date()),
    stoppedAt: ts("stopped_at"),
    lastHeartbeatAt: ts("last_heartbeat_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("runtime_project_idx").on(t.projectId)],
);

export const deployments = sqliteTable(
  "deployments",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("codexa"), // codexa | vercel
    status: text("status", { enum: deploymentStatusEnum.enumValues }).notNull().default("queued"),
    url: text("url"),
    providerDeploymentId: text("provider_deployment_id"),
    snapshotId: text("snapshot_id"),
    buildLog: text("build_log").notNull().default(""),
    error: text("error"),
    config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    finishedAt: ts("finished_at"),
  },
  (t) => [index("deployments_project_idx").on(t.projectId, t.createdAt)],
);

export const customDomains = sqliteTable(
  "custom_domains",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: ts("verified_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("custom_domains_domain_idx").on(t.domain)],
);

/** Page views of a published site, per project per UTC day (written by the Worker, worker/sites.ts). */
export const siteVisits = sqliteTable(
  "site_visits",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.day] })],
);

// ---------------------------------------------------------------------------
// Integrations (workspace-level connections)
// ---------------------------------------------------------------------------
export const integrationConnections = sqliteTable(
  "integration_connections",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // github | postgres | supabase | openai | anthropic | stripe | razorpay | resend | vercel
    name: text("name").notNull(),
    config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    secretEnc: text("secret_enc"),
    status: text("status").notNull().default("unverified"), // unverified | connected | error
    lastTestedAt: ts("last_tested_at"),
    lastError: text("last_error"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("integrations_ws_idx").on(t.workspaceId)],
);

// ---------------------------------------------------------------------------
// Billing & usage
// ---------------------------------------------------------------------------
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    plan: text("plan", { enum: planEnum.enumValues }).notNull(),
    status: text("status", { enum: subscriptionStatusEnum.enumValues }).notNull().default("active"),
    provider: text("provider").notNull().default("manual"), // stripe | razorpay | manual
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    interval: text("interval", { enum: billingIntervalEnum.enumValues }).notNull().default("month"),
    currency: text("currency", { enum: currencyEnum.enumValues }).notNull().default("USD"),
    amountMinor: integer("amount_minor").notNull().default(0),
    currentPeriodStart: ts("current_period_start"),
    currentPeriodEnd: ts("current_period_end"),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
    canceledAt: ts("canceled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("subscriptions_ws_idx").on(t.workspaceId),
    uniqueIndex("subscriptions_provider_sub_idx").on(t.provider, t.providerSubscriptionId),
  ],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerInvoiceId: text("provider_invoice_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency", { enum: currencyEnum.enumValues }).notNull(),
    status: text("status").notNull(), // paid | open | void | failed
    hostedUrl: text("hosted_url"),
    periodStart: ts("period_start"),
    periodEnd: ts("period_end"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invoices_provider_idx").on(t.provider, t.providerInvoiceId)],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: id(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    payload: text("payload", { mode: "json" }).$type<unknown>().notNull(),
    processedAt: ts("processed_at"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.eventId)],
);

export const usageEvents = sqliteTable(
  "usage_events",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // ai_request | ai_tokens | runtime_minutes | deployment | storage_bytes
    quantity: integer("quantity").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    createdAt: createdAt(),
  },
  (t) => [index("usage_ws_kind_time_idx").on(t.workspaceId, t.kind, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Platform: jobs, email, support, audit, flags, showcase, abuse
// ---------------------------------------------------------------------------
export const jobs = sqliteTable(
  "jobs",
  {
    id: id(),
    kind: text("kind").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    status: text("status", { enum: jobStatusEnum.enumValues }).notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: ts("run_at").notNull().$defaultFn(() => new Date()),
    lockedAt: ts("locked_at"),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    result: text("result", { mode: "json" }).$type<unknown>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("jobs_status_run_idx").on(t.status, t.runAt)],
);

export const emailOutbox = sqliteTable("email_outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  text: text("text").notNull().default(""),
  status: text("status", { enum: emailStatusEnum.enumValues }).notNull().default("queued"),
  provider: text("provider").notNull().default("outbox"),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: createdAt(),
  sentAt: ts("sent_at"),
});

export const supportTickets = sqliteTable(
  "support_tickets",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    kind: text("kind").notNull(), // support | bug | feature | feedback | sales | demo | contact | abuse | disclosure
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    status: text("status", { enum: ticketStatusEnum.enumValues }).notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tickets_status_idx").on(t.status, t.createdAt)],
);

export const newsletterSubscribers = sqliteTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull(),
    confirmedAt: ts("confirmed_at"),
    unsubscribedAt: ts("unsubscribed_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("newsletter_email_idx").on(t.email)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_ws_idx").on(t.workspaceId, t.createdAt), index("audit_actor_idx").on(t.actorId)],
);

export const featureFlags = sqliteTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  description: text("description").notNull().default(""),
  rules: text("rules", { mode: "json" }).$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
  updatedAt: updatedAt(),
});

export const showcaseEntries = sqliteTable(
  "showcase_entries",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    liveUrl: text("live_url"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
    submittedBy: text("submitted_by").references(() => users.id),
    approvedAt: ts("approved_at"),
    /** Number of times signed-in users copied this entry's project into their own workspace. */
    remixCount: integer("remix_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("showcase_slug_idx").on(t.slug)],
);

export const abuseReports = sqliteTable("abuse_reports", {
  id: id(),
  reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
  reporterEmail: text("reporter_email"),
  targetType: text("target_type").notNull(), // project | deployment | user | showcase
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ticketStatusEnum.enumValues }).notNull().default("open"),
  createdAt: createdAt(),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: ts("window_start").notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type ProjectSnapshot = typeof projectSnapshots.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type GenerationRun = typeof generationRuns.$inferSelect;
export type RuntimeSession = typeof runtimeSessions.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type WorkspaceRole = (typeof workspaceRoleEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];

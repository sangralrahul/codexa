import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", ["user", "staff", "admin"]);
export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "editor", "viewer"]);
export const planEnum = pgEnum("plan", ["free", "pro", "team", "enterprise"]);
export const currencyEnum = pgEnum("currency", ["INR", "USD"]);
export const projectVisibilityEnum = pgEnum("project_visibility", ["private", "unlisted", "public"]);
export const authTokenTypeEnum = pgEnum("auth_token_type", ["verify_email", "reset_password", "invite"]);
export const generationStatusEnum = pgEnum("generation_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export const runtimeStatusEnum = pgEnum("runtime_status", ["starting", "running", "stopped", "error"]);
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "building",
  "deploying",
  "live",
  "failed",
  "rolled_back",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);
export const billingIntervalEnum = pgEnum("billing_interval", ["month", "year"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "succeeded", "failed", "cancelled"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "closed"]);
export const emailStatusEnum = pgEnum("email_status", ["queued", "sent", "failed"]);

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    name: text("name").notNull().default(""),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("user"),
    locale: text("locale").notNull().default("en"),
    timezone: text("timezone").notNull().default("UTC"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: authTokenTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    email: text("email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_idx").on(t.tokenHash)],
);

export const oauthAccounts = pgTable(
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
export const workspaces = pgTable(
  "workspaces",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    plan: planEnum("plan").notNull().default("free"),
    billingCurrency: currencyEnum("billing_currency").notNull().default("USD"),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("workspaces_slug_idx").on(t.slug)],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("editor"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("wm_user_idx").on(t.userId)],
);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRoleEnum("role").notNull().default("editor"),
    tokenHash: text("token_hash").notNull(),
    invitedBy: text("invited_by").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invites_token_idx").on(t.tokenHash), index("invites_ws_idx").on(t.workspaceId)],
);

// ---------------------------------------------------------------------------
// Projects & files
// ---------------------------------------------------------------------------
export const projects = pgTable(
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
    visibility: projectVisibilityEnum("visibility").notNull().default("private"),
    createdBy: text("created_by").references(() => users.id),
    settings: jsonb("settings").$type<ProjectSettings>().notNull().default({}),
    githubRepo: text("github_repo"), // owner/name
    githubBranch: text("github_branch"),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
};

export const projectFiles = pgTable(
  "project_files",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull().default(""),
    isBinary: boolean("is_binary").notNull().default(false),
    size: integer("size").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("project_files_path_idx").on(t.projectId, t.path)],
);

export const projectSnapshots = pgTable(
  "project_snapshots",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("manual"), // manual | auto | ai | deploy | restore
    message: text("message"),
    files: jsonb("files").$type<Record<string, string>>().notNull(),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("snapshots_project_idx").on(t.projectId, t.createdAt)],
);

export const projectEnvVars = pgTable(
  "project_env_vars",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueEnc: text("value_enc").notNull(),
    isSecret: boolean("is_secret").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("env_project_key_idx").on(t.projectId, t.key)],
);

export const projectActivity = pgTable(
  "project_activity",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("activity_project_idx").on(t.projectId, t.createdAt)],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    access: text("access").notNull().default("view"), // view | edit
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("share_links_token_idx").on(t.tokenHash)],
);

// ---------------------------------------------------------------------------
// AI conversations & generation runs
// ---------------------------------------------------------------------------
export const conversations = pgTable(
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
  | { type: "plan"; steps: string[] }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; output: string; isError?: boolean }
  | { type: "file_change"; path: string; action: "create" | "update" | "delete"; summary?: string }
  | { type: "stage"; stage: string; detail?: string }
  | { type: "error"; message: string };

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | system
    content: text("content").notNull().default(""),
    parts: jsonb("parts").$type<MessagePart[]>().notNull().default([]),
    model: text("model"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id),
    status: generationStatusEnum("status").notNull().default("queued"),
    stage: text("stage").notNull().default("queued"),
    provider: text("provider"),
    model: text("model"),
    plan: jsonb("plan").$type<string[]>().notNull().default([]),
    changedFiles: jsonb("changed_files").$type<{ path: string; action: string }[]>().notNull().default([]),
    snapshotBeforeId: text("snapshot_before_id"),
    error: text("error"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    repairAttempts: integer("repair_attempts").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("runs_project_idx").on(t.projectId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Runtime sessions & deployments
// ---------------------------------------------------------------------------
export const runtimeSessions = pgTable(
  "runtime_sessions",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    runnerSessionId: text("runner_session_id"),
    status: runtimeStatusEnum("status").notNull().default("starting"),
    previewUrl: text("preview_url"),
    previewToken: text("preview_token"),
    error: text("error"),
    startedBy: text("started_by").references(() => users.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("runtime_project_idx").on(t.projectId)],
);

export const deployments = pgTable(
  "deployments",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("codexa"), // codexa | vercel
    status: deploymentStatusEnum("status").notNull().default("queued"),
    url: text("url"),
    providerDeploymentId: text("provider_deployment_id"),
    snapshotId: text("snapshot_id"),
    buildLog: text("build_log").notNull().default(""),
    error: text("error"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("deployments_project_idx").on(t.projectId, t.createdAt)],
);

export const customDomains = pgTable(
  "custom_domains",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("custom_domains_domain_idx").on(t.domain)],
);

// ---------------------------------------------------------------------------
// Integrations (workspace-level connections)
// ---------------------------------------------------------------------------
export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // github | postgres | supabase | openai | anthropic | stripe | razorpay | resend | vercel
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    secretEnc: text("secret_enc"),
    status: text("status").notNull().default("unverified"), // unverified | connected | error
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
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
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    provider: text("provider").notNull().default("manual"), // stripe | razorpay | manual
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    interval: billingIntervalEnum("interval").notNull().default("month"),
    currency: currencyEnum("currency").notNull().default("USD"),
    amountMinor: integer("amount_minor").notNull().default(0),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("subscriptions_ws_idx").on(t.workspaceId),
    uniqueIndex("subscriptions_provider_sub_idx").on(t.provider, t.providerSubscriptionId),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerInvoiceId: text("provider_invoice_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: currencyEnum("currency").notNull(),
    status: text("status").notNull(), // paid | open | void | failed
    hostedUrl: text("hosted_url"),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invoices_provider_idx").on(t.provider, t.providerInvoiceId)],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.eventId)],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // ai_request | ai_tokens | runtime_minutes | deployment | storage_bytes
    quantity: bigint("quantity", { mode: "number" }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("usage_ws_kind_time_idx").on(t.workspaceId, t.kind, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Platform: jobs, email, support, audit, flags, showcase, abuse
// ---------------------------------------------------------------------------
export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: jobStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    result: jsonb("result").$type<unknown>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("jobs_status_run_idx").on(t.status, t.runAt)],
);

export const emailOutbox = pgTable("email_outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  text: text("text").notNull().default(""),
  status: emailStatusEnum("status").notNull().default("queued"),
  provider: text("provider").notNull().default("outbox"),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: createdAt(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    kind: text("kind").notNull(), // support | bug | feature | feedback | sales | demo | contact | abuse | disclosure
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    status: ticketStatusEnum("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tickets_status_idx").on(t.status, t.createdAt)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("newsletter_email_idx").on(t.email)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_ws_idx").on(t.workspaceId, t.createdAt), index("audit_actor_idx").on(t.actorId)],
);

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description").notNull().default(""),
  rules: jsonb("rules").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: updatedAt(),
});

export const showcaseEntries = pgTable(
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
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    submittedBy: text("submitted_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("showcase_slug_idx").on(t.slug)],
);

export const abuseReports = pgTable("abuse_reports", {
  id: id(),
  reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
  reporterEmail: text("reporter_email"),
  targetType: text("target_type").notNull(), // project | deployment | user | showcase
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  createdAt: createdAt(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
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

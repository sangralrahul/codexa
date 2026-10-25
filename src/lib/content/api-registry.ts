import fs from "node:fs";
import path from "node:path";

/**
 * Hand-maintained registry of every HTTP endpoint described in
 * docs/API_CONTRACT.md. The reference page renders from this list, but it
 * never trusts the `status` field alone: `resolveEndpointStatus()` checks
 * that the route file exists on disk and exports the method, so the public
 * docs cannot claim an endpoint that is not actually implemented.
 *
 * Server-only usage for the status resolver (it reads the filesystem).
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type EndpointAuth = "none" | "session" | "admin" | "webhook-signature";
export type EndpointStatus = "implemented" | "planned";
export type EndpointGroup = "auth" | "workspaces" | "projects" | "files" | "snapshots" | "ai" | "runtime" | "deployments" | "integrations" | "billing" | "forms" | "search" | "webhooks";

export type ApiEndpoint = {
  id: string;
  method: HttpMethod;
  /** Public path with :param placeholders, e.g. /api/v1/projects/:id */
  path: string;
  group: EndpointGroup;
  summary: string;
  auth: EndpointAuth;
  /** Minimum workspace role when auth is session and a resource is involved. */
  role?: "viewer" | "editor" | "admin" | "owner";
  request?: string;
  response?: string;
  notes?: string;
  /** Intended status; the resolver downgrades to planned if the handler is missing. */
  status: EndpointStatus;
};

export const API_GROUPS: { id: EndpointGroup; title: string; description: string }[] = [
  { id: "auth", title: "Authentication", description: "Sign up, sign in, sessions and email flows." },
  { id: "workspaces", title: "Workspaces", description: "Workspaces, members and invitations." },
  { id: "projects", title: "Projects", description: "Create, read, update and delete projects." },
  { id: "files", title: "Files", description: "Read and write project files, rename, delete and search." },
  { id: "snapshots", title: "Snapshots & activity", description: "Checkpoints, diffs, restore, activity history and share links." },
  { id: "ai", title: "AI", description: "Conversations, generation runs, cancel, review and revert." },
  { id: "runtime", title: "Runtime", description: "Start and stop sandboxes, stream logs, sync files, run allowlisted commands." },
  { id: "deployments", title: "Deployments", description: "Deploy to Codexa hosting or Vercel, read build logs, roll back." },
  { id: "integrations", title: "Integrations", description: "Workspace connections, GitHub import and push, database schema and queries." },
  { id: "billing", title: "Billing & usage", description: "Usage summary, subscription, checkout, cancel and portal." },
  { id: "forms", title: "Forms", description: "Public website forms (contact, support, newsletter and others)." },
  { id: "search", title: "Search", description: "Site-wide content search." },
  { id: "webhooks", title: "Inbound webhooks", description: "Stripe and Razorpay event delivery." },
];

const ERR = `{ "error": { "code": "not_found", "message": "Project not found" } }`;

export const API_ENDPOINTS: ApiEndpoint[] = [
  // Auth
  { id: "auth-signup", method: "POST", path: "/api/auth/signup", group: "auth", summary: "Create an account and a personal workspace.", auth: "none", request: `{ "email": "you@example.com", "password": "at least 8 chars, 1 letter, 1 number", "name": "Optional" }`, response: `{ "user": { "id": "…", "email": "you@example.com", "name": "" }, "next": "/onboarding" }`, notes: "Returns 409 email_taken if the address is registered. Rate limited per IP. Sends a verification email (queued to the outbox when email is not configured).", status: "implemented" },
  { id: "auth-login", method: "POST", path: "/api/auth/login", group: "auth", summary: "Sign in with email and password; sets the session cookie.", auth: "none", request: `{ "email": "you@example.com", "password": "…" }`, response: `{ "user": { "id": "…", "email": "…" }, "next": "/dashboard" }`, notes: "401 invalid_credentials on failure. Rate limited per IP (20 / 15 min) and per email (10 / 15 min).", status: "implemented" },
  { id: "auth-logout", method: "POST", path: "/api/auth/logout", group: "auth", summary: "Invalidate the current session and clear the cookie.", auth: "session", response: `{ "ok": true }`, status: "implemented" },
  { id: "auth-me", method: "GET", path: "/api/auth/me", group: "auth", summary: "Return the signed-in user.", auth: "session", response: `{ "user": { "id": "…", "email": "…", "name": "…", "emailVerifiedAt": null } }`, notes: "401 unauthorized when there is no valid session.", status: "implemented" },
  { id: "auth-forgot", method: "POST", path: "/api/auth/forgot-password", group: "auth", summary: "Send a password reset link if the address exists.", auth: "none", request: `{ "email": "you@example.com" }`, response: `{ "ok": true }`, notes: "Always returns ok so account existence is not revealed.", status: "implemented" },
  { id: "auth-reset", method: "POST", path: "/api/auth/reset-password", group: "auth", summary: "Set a new password using a reset token.", auth: "none", request: `{ "token": "…", "password": "…" }`, response: `{ "ok": true }`, notes: "400 invalid_token when the link is expired or already used. All existing sessions are invalidated.", status: "implemented" },
  { id: "auth-verify", method: "POST", path: "/api/auth/verify-email", group: "auth", summary: "Confirm an email address with a verification token.", auth: "none", request: `{ "token": "…" }`, response: `{ "ok": true }`, status: "implemented" },
  { id: "auth-resend", method: "POST", path: "/api/auth/resend-verification", group: "auth", summary: "Re-send the verification email for the signed-in user.", auth: "session", response: `{ "ok": true }`, status: "implemented" },
  { id: "auth-github-start", method: "GET", path: "/api/auth/github/start", group: "auth", summary: "Begin GitHub OAuth (redirects to GitHub).", auth: "none", notes: "Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to be configured by the operator.", status: "implemented" },
  { id: "auth-github-callback", method: "GET", path: "/api/auth/github/callback", group: "auth", summary: "Complete GitHub OAuth and sign in or link the account.", auth: "none", status: "implemented" },

  // Workspaces
  { id: "ws-list", method: "GET", path: "/api/v1/workspaces", group: "workspaces", summary: "List workspaces the user belongs to with their role.", auth: "session", response: `{ "workspaces": [{ "workspace": { "id": "…", "name": "…", "slug": "…", "plan": "free" }, "role": "owner" }] }`, status: "implemented" },
  { id: "ws-create", method: "POST", path: "/api/v1/workspaces", group: "workspaces", summary: "Create a team workspace.", auth: "session", request: `{ "name": "Acme" }`, response: `{ "workspace": { "id": "…", "name": "Acme", "slug": "acme" } }`, status: "implemented" },
  { id: "ws-members", method: "GET", path: "/api/v1/workspaces/:id/members", group: "workspaces", summary: "List members and pending invites.", auth: "session", role: "viewer", response: `{ "members": [{ "userId": "…", "role": "editor" }], "invites": [] }`, status: "implemented" },
  { id: "ws-invite", method: "POST", path: "/api/v1/workspaces/:id/invites", group: "workspaces", summary: "Invite someone by email with a role.", auth: "session", role: "admin", request: `{ "email": "teammate@example.com", "role": "editor" }`, response: `{ "invite": { "id": "…", "email": "…", "role": "editor", "expiresAt": "…" } }`, notes: "Enforces the plan's member limit.", status: "implemented" },
  { id: "ws-remove-member", method: "DELETE", path: "/api/v1/workspaces/:id/members/:userId", group: "workspaces", summary: "Remove a member from the workspace.", auth: "session", role: "admin", response: `{ "ok": true }`, status: "implemented" },

  // Projects
  { id: "projects-list", method: "GET", path: "/api/v1/projects?workspaceId=", group: "projects", summary: "List projects in a workspace.", auth: "session", role: "viewer", response: `{ "projects": [{ "id": "…", "name": "…", "framework": "vite-react", "updatedAt": "…" }] }`, status: "implemented" },
  { id: "projects-create", method: "POST", path: "/api/v1/projects", group: "projects", summary: "Create a project from a template.", auth: "session", role: "editor", request: `{ "workspaceId": "…", "name": "My app", "description": "optional", "templateId": "vite-react-starter" }`, response: `{ "project": { "id": "…", "name": "My app", "slug": "my-app", "framework": "vite-react" } }`, notes: "Returns 402 quota_exceeded when the plan's project limit is reached.", status: "implemented" },
  { id: "projects-get", method: "GET", path: "/api/v1/projects/:id", group: "projects", summary: "Read a project with the caller's role and workspace.", auth: "session", role: "viewer", response: `{ "project": { … }, "role": "editor", "workspace": { … } }`, status: "implemented" },
  { id: "projects-update", method: "PATCH", path: "/api/v1/projects/:id", group: "projects", summary: "Update name, description, visibility or settings.", auth: "session", role: "editor", request: `{ "name": "Renamed", "settings": { "buildCommand": "npm run build", "outputDir": "dist" } }`, response: `{ "project": { … } }`, status: "implemented" },
  { id: "projects-delete", method: "DELETE", path: "/api/v1/projects/:id", group: "projects", summary: "Soft-delete a project.", auth: "session", role: "admin", response: `{ "ok": true }`, status: "implemented" },
  { id: "templates-list", method: "GET", path: "/api/v1/templates?q=&category=&framework=&sort=", group: "projects", summary: "List starter templates (without file contents).", auth: "none", response: `{ "templates": [{ "id": "vite-react-starter", "name": "…", "framework": "vite-react", "tags": [] }] }`, status: "implemented" },

  // Files
  { id: "files-list", method: "GET", path: "/api/v1/projects/:id/files", group: "files", summary: "List every file path with size and modification time.", auth: "session", role: "viewer", response: `{ "files": [{ "path": "src/App.tsx", "size": 1024, "updatedAt": "…" }] }`, status: "implemented" },
  { id: "files-read", method: "GET", path: "/api/v1/projects/:id/files/content?path=", group: "files", summary: "Read one file.", auth: "session", role: "viewer", response: `{ "path": "src/App.tsx", "content": "…" }`, status: "implemented" },
  { id: "files-write", method: "PUT", path: "/api/v1/projects/:id/files/content", group: "files", summary: "Create or overwrite one file.", auth: "session", role: "editor", request: `{ "path": "src/App.tsx", "content": "…" }`, response: `{ "file": { "path": "src/App.tsx", "size": 1024 } }`, notes: "Files are limited to 1 MB each and 2,000 per project. Paths may not contain '..' or control characters.", status: "implemented" },
  { id: "files-rename", method: "POST", path: "/api/v1/projects/:id/files/rename", group: "files", summary: "Rename or move a file or folder.", auth: "session", role: "editor", request: `{ "from": "src/old.ts", "to": "src/new.ts", "isFolder": false }`, response: `{ "ok": true }`, status: "implemented" },
  { id: "files-delete", method: "DELETE", path: "/api/v1/projects/:id/files?path=", group: "files", summary: "Delete a file, or a folder with &folder=1.", auth: "session", role: "editor", response: `{ "ok": true }`, status: "implemented" },
  { id: "files-search", method: "GET", path: "/api/v1/projects/:id/search?q=", group: "files", summary: "Search file contents.", auth: "session", role: "viewer", response: `{ "results": [{ "path": "src/App.tsx", "line": 12, "text": "…" }] }`, status: "implemented" },

  // Snapshots & activity
  { id: "snapshots-list", method: "GET", path: "/api/v1/projects/:id/snapshots", group: "snapshots", summary: "List snapshots newest first.", auth: "session", role: "viewer", response: `{ "snapshots": [{ "id": "…", "name": "Before AI run", "kind": "ai", "createdAt": "…" }] }`, status: "implemented" },
  { id: "snapshots-create", method: "POST", path: "/api/v1/projects/:id/snapshots", group: "snapshots", summary: "Create a named snapshot of every file.", auth: "session", role: "editor", request: `{ "name": "v1 before refactor", "message": "optional" }`, response: `{ "snapshot": { "id": "…", "name": "…" } }`, status: "implemented" },
  { id: "snapshots-get", method: "GET", path: "/api/v1/projects/:id/snapshots/:sid", group: "snapshots", summary: "Read a snapshot and its diff against the current files.", auth: "session", role: "viewer", response: `{ "snapshot": { … }, "diff": [{ "path": "src/App.tsx", "status": "modified", "before": "…", "after": "…" }] }`, status: "implemented" },
  { id: "snapshots-restore", method: "POST", path: "/api/v1/projects/:id/snapshots/:sid/restore", group: "snapshots", summary: "Replace the current files with the snapshot's files.", auth: "session", role: "editor", response: `{ "ok": true }`, notes: "A 'restore' snapshot of the pre-restore state is taken first so the action is reversible.", status: "implemented" },
  { id: "activity", method: "GET", path: "/api/v1/projects/:id/activity", group: "snapshots", summary: "Read the project's activity history.", auth: "session", role: "viewer", response: `{ "activity": [{ "kind": "snapshot.create", "message": "…", "createdAt": "…" }] }`, status: "implemented" },
  { id: "env-get", method: "GET", path: "/api/v1/projects/:id/env", group: "snapshots", summary: "List environment variables (values masked unless ?reveal=1 as editor).", auth: "session", role: "viewer", response: `{ "vars": [{ "key": "API_URL", "value": "••••••", "isSecret": true }] }`, status: "implemented" },
  { id: "env-put", method: "PUT", path: "/api/v1/projects/:id/env", group: "snapshots", summary: "Create or update environment variables.", auth: "session", role: "editor", request: `{ "vars": [{ "key": "API_URL", "value": "https://…", "isSecret": true }] }`, response: `{ "ok": true }`, notes: "Values are encrypted with the platform key before storage.", status: "implemented" },
  { id: "env-delete", method: "DELETE", path: "/api/v1/projects/:id/env", group: "snapshots", summary: "Delete an environment variable.", auth: "session", role: "editor", request: `{ "key": "API_URL" }`, response: `{ "ok": true }`, status: "implemented" },
  { id: "share-create", method: "POST", path: "/api/v1/projects/:id/share", group: "snapshots", summary: "Create a share link with view or edit access.", auth: "session", role: "editor", request: `{ "access": "view", "expiresInDays": 7 }`, response: `{ "url": "https://…/share/…" }`, status: "implemented" },
  { id: "share-delete", method: "DELETE", path: "/api/v1/projects/:id/share/:linkId", group: "snapshots", summary: "Revoke a share link.", auth: "session", role: "editor", response: `{ "ok": true }`, status: "implemented" },

  // AI
  { id: "ai-status", method: "GET", path: "/api/v1/projects/:id/ai/status", group: "ai", summary: "Whether an AI provider is configured, and which model is in use.", auth: "session", role: "viewer", response: `{ "configured": false, "provider": "anthropic", "model": "claude-sonnet-5-5" }`, notes: "The UI never pretends generation works when configured is false.", status: "implemented" },
  { id: "ai-conversations-list", method: "GET", path: "/api/v1/projects/:id/ai/conversations", group: "ai", summary: "List conversations in the project.", auth: "session", role: "viewer", response: `{ "conversations": [{ "id": "…", "title": "New chat" }] }`, status: "implemented" },
  { id: "ai-conversations-create", method: "POST", path: "/api/v1/projects/:id/ai/conversations", group: "ai", summary: "Start a new conversation.", auth: "session", role: "editor", response: `{ "conversation": { "id": "…", "title": "New chat" } }`, status: "implemented" },
  { id: "ai-messages", method: "GET", path: "/api/v1/projects/:id/ai/conversations/:cid/messages", group: "ai", summary: "Read a conversation's messages, including tool calls and file changes.", auth: "session", role: "viewer", response: `{ "messages": [{ "role": "assistant", "content": "…", "parts": [{ "type": "file_change", "path": "src/App.tsx", "action": "update" }] }] }`, status: "implemented" },
  { id: "ai-generate", method: "POST", path: "/api/v1/projects/:id/ai/generate", group: "ai", summary: "Start a generation run and stream its progress as server-sent events.", auth: "session", role: "editor", request: `{ "conversationId": "optional", "prompt": "Add a dark mode toggle", "mode": "build" }`, response: `event: stage\ndata: {"stage":"planning"}\n\nevent: text\ndata: {"delta":"I will…"}\n\nevent: file_change\ndata: {"path":"src/App.tsx","action":"update"}\n\nevent: done\ndata: {"runId":"…"}`, notes: "Returns 503 ai_not_configured when no provider key is set, 402 quota_exceeded when the plan's AI request or token limit is reached, 429 rate_limited when called too often. A snapshot is taken before any file is changed.", status: "implemented" },
  { id: "ai-run-get", method: "GET", path: "/api/v1/projects/:id/ai/runs/:runId", group: "ai", summary: "Read a run and the diff it produced against the pre-run snapshot.", auth: "session", role: "viewer", response: `{ "run": { "id": "…", "status": "succeeded", "repairAttempts": 1, "tokensIn": 1200, "tokensOut": 800 }, "diff": [ … ] }`, status: "implemented" },
  { id: "ai-run-cancel", method: "POST", path: "/api/v1/projects/:id/ai/runs/:runId/cancel", group: "ai", summary: "Cancel a running generation.", auth: "session", role: "editor", response: `{ "ok": true }`, status: "implemented" },
  { id: "ai-run-revert", method: "POST", path: "/api/v1/projects/:id/ai/runs/:runId/revert", group: "ai", summary: "Restore the snapshot taken before the run.", auth: "session", role: "editor", response: `{ "ok": true }`, status: "implemented" },

  // Runtime
  { id: "runtime-start", method: "POST", path: "/api/v1/projects/:id/runtime/start", group: "runtime", summary: "Start a sandbox and dev server for the project.", auth: "session", role: "editor", response: `{ "session": { "id": "…", "status": "starting", "previewUrl": "http://…preview.localhost:4100" } }`, notes: "Returns 503 with code unavailable when the runner service cannot be reached. Enforces concurrent runtime and runtime-minute limits.", status: "implemented" },
  { id: "runtime-stop", method: "POST", path: "/api/v1/projects/:id/runtime/stop", group: "runtime", summary: "Stop the running sandbox.", auth: "session", role: "editor", response: `{ "ok": true }`, status: "implemented" },
  { id: "runtime-get", method: "GET", path: "/api/v1/projects/:id/runtime", group: "runtime", summary: "Read the current runtime session, if any.", auth: "session", role: "viewer", response: `{ "session": null, "runnerAvailable": false }`, status: "implemented" },
  { id: "runtime-logs", method: "GET", path: "/api/v1/projects/:id/runtime/logs", group: "runtime", summary: "Stream sandbox logs as server-sent events.", auth: "session", role: "viewer", response: `data: {"ts":"…","stream":"stdout","line":"VITE v6 ready"}`, status: "implemented" },
  { id: "runtime-sync", method: "POST", path: "/api/v1/projects/:id/runtime/sync", group: "runtime", summary: "Push changed files into the running sandbox.", auth: "session", role: "editor", request: `{ "paths": ["src/App.tsx"] }`, response: `{ "ok": true }`, status: "implemented" },
  { id: "runtime-exec", method: "POST", path: "/api/v1/projects/:id/runtime/exec", group: "runtime", summary: "Run an allowlisted command in the sandbox.", auth: "session", role: "editor", request: `{ "command": "typecheck" }`, response: `{ "exitCode": 0, "output": "…" }`, notes: "Only install, build, test and typecheck are accepted. Arbitrary shell commands are not available by design.", status: "implemented" },

  // Deployments
  { id: "deploy-create", method: "POST", path: "/api/v1/projects/:id/deployments", group: "deployments", summary: "Build and deploy the project.", auth: "session", role: "editor", request: `{ "provider": "codexa" }`, response: `{ "deployment": { "id": "…", "status": "queued", "provider": "codexa" } }`, notes: "provider 'vercel' requires a Vercel token configured by the operator or a workspace connection. Enforces the plan's deployment limit.", status: "implemented" },
  { id: "deploy-list", method: "GET", path: "/api/v1/projects/:id/deployments", group: "deployments", summary: "List deployments newest first.", auth: "session", role: "viewer", response: `{ "deployments": [{ "id": "…", "status": "live", "url": "https://…" }] }`, status: "implemented" },
  { id: "deploy-get", method: "GET", path: "/api/v1/projects/:id/deployments/:did", group: "deployments", summary: "Read a deployment with its build log.", auth: "session", role: "viewer", response: `{ "deployment": { "id": "…", "status": "failed", "buildLog": "…", "error": "…" } }`, status: "implemented" },
  { id: "deploy-rollback", method: "POST", path: "/api/v1/projects/:id/deployments/:did/rollback", group: "deployments", summary: "Make a previous deployment live again.", auth: "session", role: "editor", response: `{ "deployment": { "id": "…", "status": "live" } }`, status: "implemented" },

  // Integrations
  { id: "integrations-list", method: "GET", path: "/api/v1/integrations", group: "integrations", summary: "List providers (with configured state) and the workspace's connections.", auth: "session", response: `{ "providers": [{ "id": "postgres", "name": "PostgreSQL", "category": "database", "configured": true, "docsUrl": "/docs/databases" }], "connections": [] }`, status: "implemented" },
  { id: "integrations-create", method: "POST", path: "/api/v1/workspaces/:id/integrations", group: "integrations", summary: "Create a connection; secrets are encrypted at rest.", auth: "session", role: "admin", request: `{ "provider": "postgres", "name": "Production", "config": { "host": "…" }, "secret": "postgres://…" }`, response: `{ "connection": { "id": "…", "provider": "postgres", "status": "unverified" } }`, status: "implemented" },
  { id: "integrations-test", method: "POST", path: "/api/v1/workspaces/:id/integrations/:cid/test", group: "integrations", summary: "Test a connection and record the result.", auth: "session", role: "admin", response: `{ "ok": true, "status": "connected" }`, status: "implemented" },
  { id: "integrations-delete", method: "DELETE", path: "/api/v1/workspaces/:id/integrations/:cid", group: "integrations", summary: "Delete a connection.", auth: "session", role: "admin", response: `{ "ok": true }`, status: "implemented" },
  { id: "github-import", method: "POST", path: "/api/v1/projects/:id/github/import", group: "integrations", summary: "Import files from a GitHub repository into the project.", auth: "session", role: "editor", request: `{ "repo": "owner/name", "branch": "main" }`, response: `{ "ok": true, "files": 42 }`, notes: "Requires the user to have connected GitHub.", status: "implemented" },
  { id: "github-push", method: "POST", path: "/api/v1/projects/:id/github/push", group: "integrations", summary: "Commit the current files and push to the linked repository.", auth: "session", role: "editor", request: `{ "message": "Update hero copy", "branch": "main" }`, response: `{ "ok": true, "commit": "abc123" }`, status: "implemented" },
  { id: "github-status", method: "GET", path: "/api/v1/projects/:id/github/status", group: "integrations", summary: "Read the linked repository and branch.", auth: "session", role: "viewer", response: `{ "connected": true, "repo": "owner/name", "branch": "main" }`, status: "implemented" },
  { id: "db-query", method: "POST", path: "/api/v1/projects/:id/database/query", group: "integrations", summary: "Run SQL against a connected database.", auth: "session", role: "editor", request: `{ "connectionId": "…", "sql": "select * from users limit 10", "confirmDestructive": false }`, response: `{ "rows": [ … ], "fields": ["id", "email"], "rowCount": 10 }`, notes: "Statements that modify or drop data return 409 confirmation_required until confirmDestructive is true.", status: "implemented" },
  { id: "db-schema", method: "GET", path: "/api/v1/projects/:id/database/schema?connectionId=", group: "integrations", summary: "Browse tables and columns of a connected database.", auth: "session", role: "viewer", response: `{ "tables": [{ "name": "users", "columns": [{ "name": "id", "type": "text" }] }] }`, status: "implemented" },

  // Billing
  { id: "usage", method: "GET", path: "/api/v1/workspaces/:id/usage", group: "billing", summary: "Current plan, limits, usage and remaining amounts for the period.", auth: "session", role: "viewer", response: `{ "plan": "free", "limits": { "aiRequestsPerMonth": 50 }, "used": { "ai_request": 3 }, "remaining": { "ai_request": 47 }, "periodStart": "…" }`, status: "implemented" },
  { id: "billing-get", method: "GET", path: "/api/v1/workspaces/:id/billing", group: "billing", summary: "Subscription, invoices and which payment providers are configured.", auth: "session", role: "admin", response: `{ "subscription": null, "invoices": [], "providers": { "stripe": false, "razorpay": false } }`, status: "implemented" },
  { id: "billing-checkout", method: "POST", path: "/api/v1/workspaces/:id/billing/checkout", group: "billing", summary: "Start a checkout for a plan.", auth: "session", role: "owner", request: `{ "plan": "pro", "interval": "month", "currency": "INR" }`, response: `{ "url": "https://checkout.stripe.com/…" }  // or { "order": { … } } for Razorpay`, notes: "Returns a not-configured error when neither Stripe nor Razorpay keys are set.", status: "implemented" },
  { id: "billing-cancel", method: "POST", path: "/api/v1/workspaces/:id/billing/cancel", group: "billing", summary: "Cancel at the end of the current period.", auth: "session", role: "owner", response: `{ "ok": true }`, status: "implemented" },
  { id: "billing-portal", method: "POST", path: "/api/v1/workspaces/:id/billing/portal", group: "billing", summary: "Open the provider's billing portal.", auth: "session", role: "owner", response: `{ "url": "https://billing.stripe.com/…" }`, status: "implemented" },

  // Forms
  { id: "forms-contact", method: "POST", path: "/api/v1/forms/contact", group: "forms", summary: "Contact form.", auth: "none", request: `{ "name": "…", "email": "…", "message": "…" }`, response: `{ "ok": true }`, notes: "All form endpoints are rate limited per IP and create a support ticket.", status: "implemented" },
  { id: "forms-support", method: "POST", path: "/api/v1/forms/support", group: "forms", summary: "Support request.", auth: "none", status: "implemented" },
  { id: "forms-bug", method: "POST", path: "/api/v1/forms/bug", group: "forms", summary: "Bug report.", auth: "none", status: "implemented" },
  { id: "forms-feature", method: "POST", path: "/api/v1/forms/feature", group: "forms", summary: "Feature request.", auth: "none", status: "implemented" },
  { id: "forms-feedback", method: "POST", path: "/api/v1/forms/feedback", group: "forms", summary: "General feedback.", auth: "none", status: "implemented" },
  { id: "forms-sales", method: "POST", path: "/api/v1/forms/sales", group: "forms", summary: "Sales enquiry.", auth: "none", status: "implemented" },
  { id: "forms-demo", method: "POST", path: "/api/v1/forms/demo", group: "forms", summary: "Demo request.", auth: "none", status: "implemented" },
  { id: "forms-newsletter", method: "POST", path: "/api/v1/forms/newsletter", group: "forms", summary: "Newsletter signup.", auth: "none", request: `{ "email": "you@example.com" }`, response: `{ "ok": true }`, status: "implemented" },
  { id: "forms-disclosure", method: "POST", path: "/api/v1/forms/disclosure", group: "forms", summary: "Responsible disclosure report.", auth: "none", status: "implemented" },

  // Search
  { id: "search", method: "GET", path: "/api/v1/search?q=&type=", group: "search", summary: "Search docs, guides, tutorials, blog, help, changelog, glossary, templates and integrations.", auth: "none", response: `{ "results": [{ "type": "docs", "title": "Deployment", "description": "…", "href": "/docs/deployment", "snippet": "…" }], "suggestions": [] }`, notes: "Short queries (under 2 characters) return suggestions instead of results. Rate limited per IP.", status: "implemented" },

  // Webhooks
  { id: "webhook-stripe", method: "POST", path: "/api/webhooks/stripe", group: "webhooks", summary: "Stripe event delivery.", auth: "webhook-signature", notes: "Verifies the Stripe-Signature header with STRIPE_WEBHOOK_SECRET. Each event id is stored in webhook_events; duplicates are acknowledged without reprocessing.", status: "implemented" },
  { id: "webhook-razorpay", method: "POST", path: "/api/webhooks/razorpay", group: "webhooks", summary: "Razorpay event delivery.", auth: "webhook-signature", notes: "Verifies X-Razorpay-Signature (HMAC-SHA256 of the raw body with RAZORPAY_WEBHOOK_SECRET). Idempotent on event id.", status: "implemented" },

  // Planned
  { id: "api-tokens", method: "POST", path: "/api/v1/tokens", group: "auth", summary: "Create a personal API token for non-browser clients.", auth: "session", notes: "Planned. Today the API accepts only the session cookie.", status: "planned" },
];

/** Map a public endpoint path to the App Router file that would implement it. */
export function routeFileForPath(endpointPath: string): string {
  const clean = endpointPath.split("?")[0];
  const segments = clean
    .split("/")
    .filter(Boolean)
    .map((s) => (s.startsWith(":") ? `[${s.slice(1)}]` : s));
  return path.join("src", "app", ...segments, "route.ts");
}

export type ResolvedEndpoint = ApiEndpoint & { resolvedStatus: EndpointStatus; routeFile: string };

/**
 * Verify an endpoint against the filesystem: the route file must exist and
 * export the HTTP method. Anything else is reported as planned regardless of
 * the registry's intent so the docs never overstate what ships.
 */
export function resolveEndpointStatus(endpoint: ApiEndpoint, rootDir: string = process.cwd()): ResolvedEndpoint {
  const routeFile = routeFileForPath(endpoint.path);
  if (endpoint.status === "planned") return { ...endpoint, resolvedStatus: "planned", routeFile };
  const abs = path.join(rootDir, routeFile);
  let resolvedStatus: EndpointStatus = "planned";
  if (fs.existsSync(abs)) {
    const src = fs.readFileSync(abs, "utf8");
    const exportsMethod = new RegExp(`export\\s+(?:const|let|async\\s+function|function)\\s+${endpoint.method}\\b`).test(src) || new RegExp(`export\\s*\\{[^}]*\\b${endpoint.method}\\b[^}]*\\}`).test(src);
    if (exportsMethod) resolvedStatus = "implemented";
  }
  return { ...endpoint, resolvedStatus, routeFile };
}

export function resolveAllEndpoints(rootDir: string = process.cwd()): ResolvedEndpoint[] {
  return API_ENDPOINTS.map((e) => resolveEndpointStatus(e, rootDir));
}

export function endpointsByGroup(resolved: ResolvedEndpoint[]) {
  return API_GROUPS.map((g) => ({ ...g, endpoints: resolved.filter((e) => e.group === g.id) })).filter((g) => g.endpoints.length > 0);
}

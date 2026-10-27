import "server-only";
import { and, count, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { integrationConnections, sessions, workspaceInvites, workspaceMembers, type Plan, type User, type WorkspaceRole } from "@/db/schema";
import { PLANS, isUnlimited } from "@/config/plans";
import { capabilities } from "@/lib/env";
import { latestSubscription } from "@/lib/billing/webhooks";
import { getGithubAccount } from "@/lib/github/accounts";
import { closestToLimit, nextSeatsPlan, usageMetrics, type UsageMetric } from "@/components/settings/usage-model";
import { assertWorkspaceRole } from "./access";
import { countProjects } from "./projects";
import { getEffectivePlan, getWorkspaceEntitlements } from "./usage";
import { listMembers } from "./workspaces";

/**
 * Read models for the settings area: the live meta chips in the settings navigation and the
 * control-centre overview. Every value comes from a database row or the plan config; nothing is
 * estimated. Workspace data is only read after assertWorkspaceRole (viewer or above), so a stale
 * workspace cookie can never leak another workspace's numbers.
 */

export type SettingsNavMeta = {
  plan: { id: Plan; name: string } | null;
  /** Members plus pending, unexpired invitations against the plan's seat limit (-1 = unlimited). */
  seats: { used: number; limit: number } | null;
  /** Workspace connections (null when there is no workspace or the table cannot be read). */
  integrations: { total: number; errors: number; providers: string[] } | null;
  /** Signed-in sessions other than this one. */
  otherSessions: number;
};

async function activeSeatCounts(workspaceId: string) {
  const now = new Date();
  const [[m], [p]] = await Promise.all([
    db.select({ n: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId)),
    db
      .select({ n: count() })
      .from(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspaceId), isNull(workspaceInvites.acceptedAt), gt(workspaceInvites.expiresAt, now))),
  ]);
  return { members: m?.n ?? 0, pending: p?.n ?? 0 };
}

async function connectionCounts(workspaceId: string): Promise<{ total: number; errors: number; providers: string[] } | null> {
  try {
    const rows = await db
      .select({ status: integrationConnections.status, provider: integrationConnections.provider })
      .from(integrationConnections)
      .where(eq(integrationConnections.workspaceId, workspaceId));
    return { total: rows.length, errors: rows.filter((r) => r.status === "error").length, providers: [...new Set(rows.map((r) => r.provider))] };
  } catch {
    return null;
  }
}

async function otherSessionCount(userId: string, currentSessionId: string | null) {
  const now = new Date();
  const where = currentSessionId
    ? and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId), gt(sessions.expiresAt, now))
    : and(eq(sessions.userId, userId), gt(sessions.expiresAt, now));
  const [row] = await db.select({ n: count() }).from(sessions).where(where);
  return row?.n ?? 0;
}

export async function getSettingsNavMeta(user: User, workspaceId: string | null, currentSessionId: string | null): Promise<SettingsNavMeta> {
  const otherSessions = await otherSessionCount(user.id, currentSessionId);
  if (!workspaceId) return { plan: null, seats: null, integrations: null, otherSessions };
  const { workspace } = await assertWorkspaceRole(user, workspaceId, "viewer");
  const [plan, seats, integrations] = await Promise.all([getEffectivePlan(workspace), activeSeatCounts(workspace.id), connectionCounts(workspace.id)]);
  return {
    plan: { id: plan, name: PLANS[plan].name },
    seats: { used: seats.members + seats.pending, limit: PLANS[plan].limits.members },
    integrations,
    otherSessions,
  };
}

export type ChecklistItem = {
  id: "verify-email" | "photo" | "timezone" | "password" | "invite" | "github";
  label: string;
  description: string;
  done: boolean;
  href?: string;
};

export type SettingsOverview = {
  account: {
    name: string;
    email: string;
    avatarUrl: string | null;
    timezone: string;
    locale: string;
    memberSince: string;
    emailVerified: boolean;
    /** capabilities.email: whether this server can deliver account emails (verification links). */
    emailConfigured: boolean;
    passwordSet: boolean;
    /** null when GitHub sign-in is not configured on this server and no account is linked. */
    github: { linked: boolean; username: string | null } | null;
    sessions: number;
    otherSessions: number;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    currency: "USD" | "INR";
    role: WorkspaceRole;
    createdAt: string;
    canManage: boolean;
    plan: { id: Plan; name: string; tagline: string };
    subscription: { status: string; provider: string; interval: "month" | "year"; periodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
    seats: { used: number; limit: number; pending: number; memberCount: number; people: { userId: string; name: string; email: string; avatarUrl: string | null }[] };
    nextSeats: { name: string; seats: number } | null;
    usage: { periodStart: string; closest: UsageMetric | null };
    integrations: { total: number; errors: number; providers: string[] } | null;
  } | null;
  checklist: ChecklistItem[];
};

/** Everything the settings overview shows, for the signed-in user and (optionally) their current workspace. */
export async function getSettingsOverview(user: User, workspaceId: string | null, currentSessionId: string | null): Promise<SettingsOverview> {
  const [github, otherSessions] = await Promise.all([getGithubAccount(user.id), otherSessionCount(user.id, currentSessionId)]);
  const account: SettingsOverview["account"] = {
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    timezone: user.timezone,
    locale: user.locale,
    memberSince: user.createdAt.toISOString(),
    emailVerified: Boolean(user.emailVerifiedAt),
    emailConfigured: capabilities.email,
    passwordSet: Boolean(user.passwordHash),
    github: github ? { linked: true, username: github.username } : capabilities.github ? { linked: false, username: null } : null,
    sessions: otherSessions + (currentSessionId ? 1 : 0),
    otherSessions,
  };

  let workspace: SettingsOverview["workspace"] = null;
  if (workspaceId) {
    const { workspace: ws, role } = await assertWorkspaceRole(user, workspaceId, "viewer");
    const [entitlements, projects, members, seatCounts, sub, integrations] = await Promise.all([
      getWorkspaceEntitlements(ws),
      countProjects(ws.id),
      listMembers(ws.id),
      activeSeatCounts(ws.id),
      latestSubscription(ws.id),
      connectionCounts(ws.id),
    ]);
    const plan = entitlements.plan;
    const metrics = usageMetrics(entitlements, { projects, members: members.length, pending: seatCounts.pending });
    const paid = sub && sub.provider !== "manual" && sub.status !== "canceled";
    workspace = {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      currency: ws.billingCurrency,
      role,
      createdAt: ws.createdAt.toISOString(),
      canManage: role === "owner" || role === "admin",
      plan: { id: plan, name: PLANS[plan].name, tagline: PLANS[plan].tagline },
      subscription: paid
        ? { status: sub.status, provider: sub.provider, interval: sub.interval, periodEnd: sub.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: sub.cancelAtPeriodEnd }
        : null,
      seats: {
        used: members.length + seatCounts.pending,
        limit: PLANS[plan].limits.members,
        pending: seatCounts.pending,
        memberCount: members.length,
        people: members.slice(0, 5).map((m) => ({ userId: m.userId, name: m.name || m.email, email: m.email, avatarUrl: m.avatarUrl })),
      },
      nextSeats: nextSeatsPlan(plan),
      usage: { periodStart: entitlements.periodStart.toISOString(), closest: closestToLimit(metrics) },
      integrations,
    };
  }

  return { account, workspace, checklist: buildChecklist(account, workspace) };
}

/** "Finish setting up": only items that reflect real state, and only the ones that apply to this account. */
export function buildChecklist(account: SettingsOverview["account"], workspace: SettingsOverview["workspace"]): ChecklistItem[] {
  const items: ChecklistItem[] = [
    {
      id: "verify-email",
      label: "Verify your email",
      // Only claim a link was sent when this server can actually deliver email.
      description: account.emailVerified
        ? `${account.email} is verified.`
        : account.emailConfigured
          ? `Unlocks deployments. The link went to ${account.email}.`
          : "Email delivery isn't configured on this server; ask the operator to verify your account.",
      done: account.emailVerified,
    },
    { id: "photo", label: "Add a profile photo", description: "Teammates see it on comments, presence and the members list.", done: Boolean(account.avatarUrl), href: "/settings/profile" },
    {
      id: "timezone",
      label: "Set your time zone",
      description: account.timezone === "UTC" ? "Still UTC, the default. Dates in activity and emails use it." : `Dates show in ${account.timezone.replace(/_/g, " ")}.`,
      done: account.timezone !== "UTC",
      href: "/settings/profile#timezone",
    },
  ];
  if (!account.passwordSet) items.push({ id: "password", label: "Set a password", description: "You sign in with GitHub only. A password adds email sign-in.", done: false, href: "/settings/security#password" });
  if (workspace?.canManage && (isUnlimited(workspace.seats.limit) || workspace.seats.limit > 1)) {
    const invited = workspace.seats.memberCount > 1 || workspace.seats.pending > 0;
    items.push({ id: "invite", label: "Invite a teammate", description: invited ? "Your workspace has more than one person." : "Your plan has room for more people.", done: invited, href: "/settings/members#invite" });
  }
  if (account.github) items.push({ id: "github", label: "Link GitHub", description: account.github.linked ? `Linked as @${account.github.username}.` : "Import repositories and push commits.", done: account.github.linked, href: "/connect-github" });
  return items;
}

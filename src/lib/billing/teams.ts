/**
 * Pure role rules for workspace teams. The API routes apply these against the
 * member list so the invariants (always at least one owner, no self-promotion)
 * are testable without a database.
 */
import { ROLE_RANK } from "@/lib/services/access";
import type { WorkspaceRole } from "@/db/schema";

export const ASSIGNABLE_ROLES: WorkspaceRole[] = ["owner", "admin", "editor", "viewer"];

export type MemberLike = { userId: string; role: WorkspaceRole };
export type RuleResult = { ok: true } | { ok: false; status: 400 | 403; message: string };

function countOwners(members: MemberLike[]) {
  return members.filter((m) => m.role === "owner").length;
}

/**
 * Can `actor` set `target`'s role to `newRole`?
 * - owner/admin only; admins cannot grant or remove the owner role;
 * - the last owner cannot be demoted; granting owner is an explicit transfer
 *   that is allowed only for owners.
 */
export function canChangeRole(actor: MemberLike, target: MemberLike, newRole: WorkspaceRole, members: MemberLike[]): RuleResult {
  if (ROLE_RANK[actor.role] < ROLE_RANK.admin) return { ok: false, status: 403, message: "Only owners and admins can change roles" };
  if (target.role === newRole) return { ok: true };
  if (actor.role === "admin") {
    if (target.role === "owner") return { ok: false, status: 403, message: "Admins cannot change an owner's role" };
    if (newRole === "owner") return { ok: false, status: 403, message: "Only an owner can transfer ownership" };
  }
  if (target.role === "owner" && newRole !== "owner" && countOwners(members) <= 1) {
    return { ok: false, status: 400, message: "A workspace must keep at least one owner. Transfer ownership first." };
  }
  return { ok: true };
}

/** Can `actor` remove `target` (or themselves, when actor.userId === target.userId)? */
export function canRemoveMember(actor: MemberLike, target: MemberLike, members: MemberLike[]): RuleResult {
  const self = actor.userId === target.userId;
  if (target.role === "owner" && countOwners(members) <= 1) {
    return { ok: false, status: 400, message: self ? "You are the last owner. Transfer ownership before leaving." : "The last owner cannot be removed" };
  }
  if (self) return { ok: true }; // members can always leave (last-owner rule above)
  if (ROLE_RANK[actor.role] < ROLE_RANK.admin) return { ok: false, status: 403, message: "Only owners and admins can remove members" };
  if (actor.role === "admin" && target.role === "owner") return { ok: false, status: 403, message: "Admins cannot remove an owner" };
  return { ok: true };
}

/** Can `actor` invite someone with `role`? Admins cannot invite owners. */
export function canInviteRole(actor: MemberLike, role: WorkspaceRole): RuleResult {
  if (ROLE_RANK[actor.role] < ROLE_RANK.admin) return { ok: false, status: 403, message: "Only owners and admins can invite members" };
  if (role === "owner" && actor.role !== "owner") return { ok: false, status: 403, message: "Only an owner can invite another owner" };
  return { ok: true };
}

/** Seat check: -1 means unlimited. Pending invites count as reserved seats. */
export function seatsAvailable(limit: number, memberCount: number, pendingInvites: number): boolean {
  if (limit < 0) return true;
  return memberCount + pendingInvites < limit;
}

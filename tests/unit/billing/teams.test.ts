import { describe, expect, it } from "vitest";
import { canChangeRole, canInviteRole, canRemoveMember, seatsAvailable, type MemberLike } from "@/lib/billing/teams";

const owner: MemberLike = { userId: "o", role: "owner" };
const owner2: MemberLike = { userId: "o2", role: "owner" };
const admin: MemberLike = { userId: "a", role: "admin" };
const editor: MemberLike = { userId: "e", role: "editor" };
const viewer: MemberLike = { userId: "v", role: "viewer" };

describe("team role rules", () => {
  const team = [owner, admin, editor, viewer];

  it("last owner cannot be demoted or removed, even by themselves", () => {
    expect(canChangeRole(owner, owner, "admin", team)).toMatchObject({ ok: false, status: 400 });
    expect(canRemoveMember(owner, owner, team)).toMatchObject({ ok: false, status: 400 });
    expect(canRemoveMember(owner, owner, [owner, owner2, admin]).ok).toBe(true);
    expect(canChangeRole(owner, owner, "admin", [owner, owner2]).ok).toBe(true);
  });

  it("owners can transfer ownership explicitly; admins cannot touch owners", () => {
    expect(canChangeRole(owner, editor, "owner", team).ok).toBe(true);
    expect(canChangeRole(admin, editor, "owner", team)).toMatchObject({ ok: false, status: 403 });
    expect(canChangeRole(admin, owner, "admin", team)).toMatchObject({ ok: false, status: 403 });
    expect(canRemoveMember(admin, owner, [owner, owner2, admin])).toMatchObject({ ok: false, status: 403 });
  });

  it("admins manage editors/viewers; editors and viewers manage nobody", () => {
    expect(canChangeRole(admin, editor, "viewer", team).ok).toBe(true);
    expect(canRemoveMember(admin, viewer, team).ok).toBe(true);
    expect(canChangeRole(editor, viewer, "editor", team)).toMatchObject({ ok: false, status: 403 });
    expect(canRemoveMember(viewer, editor, team)).toMatchObject({ ok: false, status: 403 });
    expect(canChangeRole(editor, editor, "editor", team)).toMatchObject({ ok: false, status: 403 });
  });

  it("any member can leave unless they are the last owner", () => {
    expect(canRemoveMember(viewer, viewer, team).ok).toBe(true);
    expect(canRemoveMember(editor, editor, team).ok).toBe(true);
  });

  it("invites: admins+ only, and only owners can invite owners", () => {
    expect(canInviteRole(editor, "viewer")).toMatchObject({ ok: false, status: 403 });
    expect(canInviteRole(admin, "editor").ok).toBe(true);
    expect(canInviteRole(admin, "owner")).toMatchObject({ ok: false, status: 403 });
    expect(canInviteRole(owner, "owner").ok).toBe(true);
  });

  it("seat limits count pending invites and treat -1 as unlimited", () => {
    expect(seatsAvailable(-1, 500, 500)).toBe(true);
    expect(seatsAvailable(1, 1, 0)).toBe(false);
    expect(seatsAvailable(10, 8, 1)).toBe(true);
    expect(seatsAvailable(10, 8, 2)).toBe(false);
  });
});

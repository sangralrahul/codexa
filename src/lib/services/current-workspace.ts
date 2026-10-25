import "server-only";
import { cookies } from "next/headers";
import { getDefaultWorkspace, listUserWorkspaces } from "./workspaces";
import type { User } from "@/db/schema";

export const WORKSPACE_COOKIE = "codexa_workspace";

/** Resolve the user's current workspace (cookie-selected or default). */
export async function getCurrentWorkspace(user: User) {
  const all = await listUserWorkspaces(user.id);
  const store = await cookies();
  const selected = store.get(WORKSPACE_COOKIE)?.value;
  const found = selected ? all.find((w) => w.workspace.id === selected) : undefined;
  const current = found ?? all.find((w) => w.role === "owner") ?? all[0] ?? null;
  if (!current) {
    const def = await getDefaultWorkspace(user.id);
    return { current: def, all };
  }
  return { current, all };
}

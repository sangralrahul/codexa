import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { accountApi, projectsApi, workspacesApi, type Project, type Role, type Usage, type Workspace } from "../lib/api";

export type Route =
  | { name: "home" }
  | { name: "projects" }
  | { name: "templates" }
  | { name: "settings"; tab?: "account" | "workspace" | "app" }
  | { name: "project"; id: string; prompt?: string };

type Ctx = {
  user: SessionUser;
  setUser: (u: SessionUser) => void;
  route: Route;
  go: (r: Route) => void;
  back: () => void;
  canGoBack: boolean;
  workspaces: { workspace: Workspace; role: Role }[];
  workspace: Workspace | null;
  role: Role | null;
  setWorkspaceId: (id: string) => void;
  projects: Project[] | null;
  usage: Usage | null;
  refreshProjects: () => Promise<void>;
  signOut: () => Promise<void>;
  appUrl: string;
  version: string;
};

const AppCtx = createContext<Ctx | null>(null);

export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
};

const WS_KEY = "codexa:workspace";

export function AppProvider({ user: initialUser, appUrl, version, onSignedOut, children }: { user: SessionUser; appUrl: string; version: string; onSignedOut: () => void; children: ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [stack, setStack] = useState<Route[]>([{ name: "home" }]);
  const [workspaces, setWorkspaces] = useState<{ workspace: Workspace; role: Role }[]>([]);
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(() => localStorage.getItem(WS_KEY));
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    workspacesApi
      .list()
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => setWorkspaces([]));
  }, []);

  const current = workspaces.find((w) => w.workspace.id === workspaceId) ?? workspaces[0] ?? null;

  const refreshProjects = useCallback(async () => {
    if (!current) return;
    try {
      const r = await projectsApi.list(current.workspace.id);
      const touched = (p: Project) => new Date(p.lastOpenedAt ?? p.updatedAt).getTime();
      setProjects([...r.projects].sort((a, b) => touched(b) - touched(a)));
      accountApi
        .usage(current.workspace.id)
        .then(setUsage)
        .catch(() => setUsage(null));
    } catch {
      setProjects([]);
    }
  }, [current]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from the API when the inputs change
    void refreshProjects();
  }, [refreshProjects]);

  const value = useMemo<Ctx>(
    () => ({
      user,
      setUser,
      route: stack[stack.length - 1],
      go: (r) => setStack((s) => (r.name === "project" || s.length < 30 ? [...s, r] : [...s.slice(-20), r])),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      canGoBack: stack.length > 1,
      workspaces,
      workspace: current?.workspace ?? null,
      role: current?.role ?? null,
      setWorkspaceId: (id) => {
        localStorage.setItem(WS_KEY, id);
        setWorkspaceIdState(id);
        setProjects(null);
      },
      projects,
      usage,
      refreshProjects,
      signOut: async () => {
        await window.codexa.logout();
        onSignedOut();
      },
      appUrl,
      version,
    }),
    [user, stack, workspaces, current, projects, usage, refreshProjects, onSignedOut, appUrl, version],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, LogOut, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { useApp } from "../app/state";
import { accountApi, ApiError } from "../lib/api";
import { cn } from "../lib/util";
import { Avatar, Button, Field, Input, Kbd, Spinner, toast } from "../ui";
import { applyTheme, getThemeMode, type ThemeMode } from "../app/theme";

type Tab = "account" | "workspace" | "app";
const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "workspace", label: "Workspace & usage" },
  { id: "app", label: "App" },
];

export function SettingsScreen({ tab: initial }: { tab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial ?? "account");
  return (
    <div className="scroll h-full">
      <div className="mx-auto max-w-[820px] px-10 py-10">
        <p className="eyebrow flex items-center gap-2">
          <i className="block size-1.5 bg-fg" /> Account and app
        </p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.04em]">Settings</h1>
        <div className="mt-6 flex gap-1 border-b border-border" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-[13.5px] font-medium transition-colors", tab === t.id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-8 space-y-6">
          {tab === "account" ? <AccountTab /> : null}
          {tab === "workspace" ? <WorkspaceTab /> : null}
          {tab === "app" ? <AppTab /> : null}
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-border bg-bg">
      <div className="p-6">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
      {footer ? <div className="flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">{footer}</div> : null}
    </section>
  );
}

function AccountTab() {
  const { user, setUser, signOut } = useApp();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await accountApi.profile(name.trim());
      setUser({ ...user, name: name.trim() });
      toast.success("Profile saved");
    } catch (err) {
      toast.error("Couldn't save", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Section
        title="Profile"
        description={user.createdAt ? `How you appear to teammates · member since ${new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "How you appear to teammates."}
        footer={
          <Button variant="primary" size="sm" onClick={() => void save()} loading={busy} disabled={!name.trim() || name.trim() === user.name}>
            Save
          </Button>
        }
      >
        <div className="flex items-start gap-5">
          <Avatar name={name || user.email} size={52} />
          <div className="grid flex-1 gap-4">
            <Field label="Name" htmlFor="set-name">
              <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Email" htmlFor="set-email" hint="Change your email or password on the web.">
              <Input id="set-email" value={user.email} disabled className="opacity-70" />
            </Field>
          </div>
        </div>
      </Section>
      <Section title="Security" description="Password, sessions and two-step sign-in are managed on the web.">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void window.codexa.openWeb("/settings/security")}>
            <ExternalLink /> Open security settings
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void signOut()}>
            <LogOut /> Sign out of this app
          </Button>
        </div>
      </Section>
    </>
  );
}

type UsageResponse = { plan: string; limits: Record<string, number>; used: Record<string, number>; counts: { projects: number; members: number } };

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0 || limit >= 1e9;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{unlimited ? `${used.toLocaleString()} · unlimited` : `${used.toLocaleString()} / ${limit.toLocaleString()}`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={cn("h-full rounded-full", pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-fg/70")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WorkspaceTab() {
  const { workspace } = useApp();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!workspace) return;
    accountApi
      .usage(workspace.id)
      .then((u) => setUsage(u as unknown as UsageResponse))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load usage"));
  }, [workspace]);
  return (
    <>
      <Section
        title={workspace?.name ?? "Workspace"}
        description={
          <>
            <span className="capitalize">{usage?.plan ?? workspace?.plan ?? "free"}</span> plan · usage this month
          </>
        }
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => void window.codexa.openWeb("/settings/members")}>
              <ExternalLink /> Members
            </Button>
            <Button size="sm" onClick={() => void window.codexa.openWeb("/settings/billing")}>
              <ExternalLink /> Plans & billing
            </Button>
          </>
        }
      >
        {error ? (
          <p className="text-[13px] text-danger">{error}</p>
        ) : !usage ? (
          <Spinner />
        ) : (
          <div className="grid gap-5">
            <Meter label="Projects" used={usage.counts.projects} limit={usage.limits.projects ?? -1} />
            <Meter label="AI requests" used={usage.used.ai_request ?? 0} limit={usage.limits.aiRequestsPerMonth ?? -1} />
            <Meter label="Preview minutes" used={usage.used.runtime_minutes ?? 0} limit={usage.limits.runtimeMinutesPerMonth ?? -1} />
            <Meter label="Deployments" used={usage.used.deployment ?? 0} limit={usage.limits.deploymentsPerMonth ?? -1} />
          </div>
        )}
      </Section>
    </>
  );
}

function AppTab() {
  const { version, appUrl } = useApp();
  const [theme, setTheme] = useState<ThemeMode>(getThemeMode());
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  return (
    <>
      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {(
            [
              ["system", "System", Monitor],
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={theme === m}
              onClick={() => {
                setTheme(m);
                void applyTheme(m);
              }}
              className={cn("flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-[13px] font-medium transition-colors", theme === m ? "border-fg bg-surface" : "border-border hover:border-border-strong")}
            >
              <Icon className="size-5 text-muted" /> {label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Keyboard shortcuts" description="Work faster without leaving the keyboard.">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[13px]">
          {(
            [
              ["Search projects and commands", ["Ctrl", "K"]],
              ["New project", ["Ctrl", "N"]],
              ["Home · Projects · Templates", ["Ctrl", "1–3"]],
              ["Settings", ["Ctrl", ","]],
              ["Preview view", ["Ctrl", "P"]],
              ["Code view", ["Ctrl", "E"]],
              ["Console", ["Ctrl", "J"]],
              ["Save file", ["Ctrl", "S"]],
            ] as const
          ).map(([label, keys]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
              <dt className="text-muted">{label}</dt>
              <dd className="flex gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section
        title="About Codexa for Windows"
        description={`Version ${version} · connected to ${appUrl.replace(/^https?:\/\//, "")}`}
        footer={
          <Button
            size="sm"
            loading={checking}
            onClick={async () => {
              setChecking(true);
              const r = await window.codexa.checkUpdates();
              setChecking(false);
              setUpdateMsg(r.message);
            }}
          >
            <RefreshCw /> Check for updates
          </Button>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">Updates download in the background and install the next time you restart the app.</p>
        {updateMsg ? <p className="mt-3 text-[13px] font-medium">{updateMsg}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => void window.codexa.openWeb("/docs")}>
            <ExternalLink /> Documentation
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void window.codexa.openWeb("/status")}>
            <ExternalLink /> Service status
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void window.codexa.openExternal("https://github.com/sangralrahul/codexa/releases")}>
            <ExternalLink /> Release notes
          </Button>
        </div>
      </Section>
    </>
  );
}

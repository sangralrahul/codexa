import Link from "next/link";
import {
  Activity,
  Bookmark,
  CircleAlert,
  Copy,
  Database,
  FileCode2,
  FolderGit2,
  Globe,
  History,
  KeyRound,
  Link2,
  Pencil,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Square,
  SquareTerminal,
  Trash2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { absoluteTime, relativeTime } from "./format";
import { PanelCard } from "./panel-card";

/** One project_activity row (edits by the same person folded into `count`). Serializable. */
export type RiverItem = {
  id: string;
  projectId: string;
  projectName: string;
  kind: string;
  message: string;
  actorId: string | null;
  actorName: string;
  /** Avatar colour seed shared with every other avatar of this person (name, else email). */
  actorSeed?: string;
  actorAvatarUrl: string | null;
  createdAt: string;
  count: number;
};

type Verb = { icon: typeof Activity; verb: (n: number) => string; tone?: "success" | "danger" | "accent" | "info" };
const VERBS: Record<string, Verb> = {
  "project.created": { icon: Plus, verb: () => "created" },
  "project.updated": { icon: Pencil, verb: () => "updated" },
  "project.duplicated": { icon: Copy, verb: () => "duplicated" },
  "project.deleted": { icon: Trash2, verb: () => "deleted" },
  "ai.run": { icon: Sparkles, verb: () => "ran the agent on", tone: "accent" },
  "ai.reverted": { icon: Undo2, verb: () => "reverted an AI run in" },
  "deployment.queued": { icon: Rocket, verb: () => "started a deploy of", tone: "info" },
  "deployment.live": { icon: Globe, verb: () => "deployed", tone: "success" },
  "deployment.failed": { icon: CircleAlert, verb: () => "had a failed deploy of", tone: "danger" },
  "deployment.rolled_back": { icon: History, verb: () => "rolled back" },
  "runtime.started": { icon: Play, verb: () => "started the preview of", tone: "success" },
  "runtime.stopped": { icon: Square, verb: () => "stopped the preview of" },
  "runtime.exec": { icon: SquareTerminal, verb: () => "ran a command in" },
  "file.created": { icon: FileCode2, verb: (n) => (n > 1 ? `made ${n} file changes in` : "created a file in") },
  "file.updated": { icon: FileCode2, verb: (n) => (n > 1 ? `made ${n} file changes in` : "edited a file in") },
  "file.deleted": { icon: FileCode2, verb: (n) => (n > 1 ? `made ${n} file changes in` : "deleted a file in") },
  "file.renamed": { icon: FileCode2, verb: (n) => (n > 1 ? `made ${n} file changes in` : "renamed a file in") },
  "snapshot.created": { icon: Bookmark, verb: () => "saved a checkpoint of" },
  "snapshot.restored": { icon: History, verb: () => "restored a checkpoint of" },
  "github.imported": { icon: FolderGit2, verb: () => "imported" },
  "github.pulled": { icon: FolderGit2, verb: () => "pulled changes into" },
  "github.pushed": { icon: FolderGit2, verb: () => "pushed" },
  "github.unlinked": { icon: FolderGit2, verb: () => "unlinked GitHub from" },
  "share.created": { icon: Link2, verb: () => "shared" },
  "share.revoked": { icon: Link2, verb: () => "revoked a share link of" },
  "env.updated": { icon: KeyRound, verb: () => "updated environment variables of" },
  "env.deleted": { icon: KeyRound, verb: () => "removed an environment variable from" },
  "database.query": { icon: Database, verb: () => "ran SQL in" },
};

/** The verb phrase for an activity kind ("ran the agent on"), for compact feeds elsewhere. */
export function activityVerb(kind: string, count = 1): string {
  return (VERBS[kind] ?? { verb: () => "updated" }).verb(count);
}

const TONE = { success: "text-success", danger: "text-danger", accent: "text-primary", info: "text-info" } as const;

/** The stored message, minus the part the verb line already says (the project name / "Project created from …"). */
function detailOf(a: RiverItem): string | null {
  const m = a.message.trim();
  if (!m || m.length < 12) return null;
  if (a.kind.startsWith("file.") && a.count > 1) return null;
  return m.length > 90 ? `${m.slice(0, 88)}…` : m;
}

/**
 * Activity: the newest project_activity rows across the user's workspaces as "who · did what · to
 * which project · when": the person's avatar with the event icon badged on it, the verb line, the
 * stored message underneath (verbatim) and the relative time. Server-safe.
 */
export function ActivityRiver({ items, className }: { items: RiverItem[]; className?: string }) {
  const people = new Set(items.map((a) => a.actorId ?? a.actorName)).size;
  return (
    <PanelCard
      title="Recent activity"
      icon={Activity}
      aside={<span className="text-foreground-dim">{items.length ? `${people} ${people === 1 ? "person" : "people"} · all workspaces` : "All workspaces"}</span>}
      className={className}
    >
      {items.length === 0 ? (
        <div className="px-4 py-5 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">Nothing yet</p>
          <p className="mt-0.5">Edits, AI runs, previews, checkpoints and deploys from your projects show up here as they happen.</p>
        </div>
      ) : (
        <ol className="river-in divide-y divide-border">
          {items.map((a) => {
            const v = VERBS[a.kind] ?? { icon: Activity, verb: () => "updated" };
            const Icon = v.icon;
            const detail = detailOf(a);
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="relative mt-px shrink-0">
                  <Avatar name={a.actorName} seed={a.actorSeed ?? a.actorName} src={a.actorAvatarUrl} size="md" />
                  <span
                    className={cn("absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-card shadow-[0_0_0_1px_var(--border)]", v.tone ? TONE[v.tone] : "text-muted-foreground")}
                    aria-hidden="true"
                  >
                    <Icon className="size-2.5" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-snug" title={a.message}>
                    <span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{v.verb(a.count)}</span>{" "}
                    <Link href={`/projects/${a.projectId}`} className="link-draw font-medium">
                      {a.projectName}
                    </Link>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-foreground-dim">
                    <time dateTime={a.createdAt} title={absoluteTime(a.createdAt)} className="shrink-0 tabular-nums">
                      {relativeTime(a.createdAt)}
                    </time>
                    {detail ? (
                      <>
                        <span aria-hidden="true" className="text-border-strong">
                          ·
                        </span>
                        <span className="truncate text-muted-foreground">{detail}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </PanelCard>
  );
}

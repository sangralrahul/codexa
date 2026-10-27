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
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { absoluteTime, relativeTime } from "./format";

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

type Verb = { icon: typeof Activity; verb: (n: number) => string; tone?: "success" | "danger" | "signal" | "info" };
const VERBS: Record<string, Verb> = {
  "project.created": { icon: Plus, verb: () => "created" },
  "project.updated": { icon: Pencil, verb: () => "updated" },
  "project.duplicated": { icon: Copy, verb: () => "duplicated" },
  "project.deleted": { icon: Trash2, verb: () => "deleted" },
  "ai.run": { icon: Sparkles, verb: () => "ran the AI agent on", tone: "signal" },
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

const TONE = { success: "text-success", danger: "text-danger", signal: "text-signal", info: "text-info" } as const;

/**
 * Activity river: the newest project_activity rows across the user's workspaces (who, what,
 * which project, when). The detail line is the stored message, verbatim. New rows slide in
 * on each load. Server-safe.
 */
export function ActivityRiver({ items, className }: { items: RiverItem[]; className?: string }) {
  return (
    <section aria-labelledby="activity-title" className={cn("e1 flex min-w-0 flex-col rounded-[18px]", className)}>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
        <h2 id="activity-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          Activity
        </h2>
        <p className="text-meta text-foreground-dim">Across your workspaces</p>
      </div>
      {items.length === 0 ? (
        <p className="m-5 flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-border-strong px-4 py-8 text-center text-[13px] text-muted-foreground">
          Edits, AI runs, previews and deploys from your projects show up here as they happen.
        </p>
      ) : (
        <ol className="river-in relative mt-3 px-2 pb-2">
          {items.map((a, i) => {
            const v = VERBS[a.kind] ?? { icon: Activity, verb: () => "updated" };
            const Icon = v.icon;
            return (
              <li key={a.id} className="group/act relative flex gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-foreground/[0.03]">
                {i < items.length - 1 ? <span aria-hidden="true" className="absolute bottom-[-6px] left-[27px] top-[38px] w-px bg-border" /> : null}
                <span className="relative mt-0.5 shrink-0">
                  <Avatar name={a.actorName} src={a.actorAvatarUrl} seed={a.actorSeed ?? a.actorName} size="sm" />
                  <span className={cn("absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-card shadow-[0_0_0_2px_var(--card),inset_0_0_0_1px_var(--border)]", v.tone ? TONE[v.tone] : "text-muted-foreground")}>
                    <Icon className="size-2.5" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">
                    <span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{v.verb(a.count)}</span>{" "}
                    <Link href={`/projects/${a.projectId}`} className="link-draw font-medium">
                      {a.projectName}
                    </Link>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-foreground-dim" title={a.message}>
                    {a.message}
                  </p>
                </div>
                <time dateTime={a.createdAt} title={absoluteTime(a.createdAt)} className="text-meta shrink-0 pt-0.5 text-muted-foreground">
                  {relativeTime(a.createdAt)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
      {items.length ? (
        <p className="text-meta mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-foreground-dim">
          <span>Newest first · consecutive file edits are grouped</span>
          <Link href="/projects" className="link-draw shrink-0 text-muted-foreground hover:text-foreground">
            All projects
          </Link>
        </p>
      ) : null}
    </section>
  );
}

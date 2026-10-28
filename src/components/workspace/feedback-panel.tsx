"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, Link2, MessageSquareText, RefreshCw, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import type { FeedbackCommentDto } from "@/lib/services/feedback";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { relativeTime } from "@/components/projects/format";
import { ConfirmDialog } from "./confirm-dialog";

type LinkInfo = { id: string; createdAt: string } | null;
type Filter = "open" | "resolved" | "all";

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}/feedback`;
const POLL_MS = 30_000;

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** The prompt "Fix with AI" sends to the agent: the client's words plus where they pointed. */
export function fixPrompt(c: Pick<FeedbackCommentDto, "authorName" | "body" | "pagePath" | "element">): string {
  const lines = [`A client left this feedback on the app through the review link (${c.authorName}, page ${c.pagePath}):`, "", c.body.split("\n").map((l) => `> ${l}`).join("\n"), ""];
  if (c.element) {
    lines.push("It is pinned to this element:", `- CSS path: ${c.element.path}`);
    if (c.element.text) lines.push(`- Text: "${c.element.text}"`);
    if (c.element.html) lines.push("- HTML:", "```html", c.element.html, "```");
    lines.push("");
  } else {
    lines.push("It is about the page as a whole.", "");
  }
  lines.push("Find the component that renders this and make the change the client asked for. Keep everything else as it is.");
  return lines.join("\n");
}

export function FeedbackPanel({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [link, setLink] = useState<LinkInfo | undefined>(undefined);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkBusy, setLinkBusy] = useState<"create" | "revoke" | null>(null);
  const [comments, setComments] = useState<FeedbackCommentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"revoke" | { deleteId: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadComments = useCallback(
    () =>
      api<{ comments: FeedbackCommentDto[] }>(`${base(projectId)}/comments`)
        .then((r) => {
          setComments(r.comments);
          setError(null);
        })
        .catch((e) => setError(errorText(e, "Could not load comments"))),
    [projectId],
  );

  useEffect(() => {
    void loadComments();
    const id = window.setInterval(() => void loadComments(), POLL_MS);
    return () => window.clearInterval(id);
  }, [loadComments]);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    api<{ link: LinkInfo }>(`${base(projectId)}/links`)
      .then((r) => !cancelled && setLink(r.link))
      .catch((e) => !cancelled && setError(errorText(e, "Could not load the review link")));
    return () => {
      cancelled = true;
    };
  }, [projectId, canEdit]);

  const createLink = async () => {
    setLinkBusy("create");
    setError(null);
    try {
      const r = await api<{ url: string; link: { id: string; createdAt: string } }>(`${base(projectId)}/links`, { method: "POST" });
      setLink(r.link);
      setCreated(r.url);
      setCopied(false);
    } catch (e) {
      setError(errorText(e, "Could not create the review link"));
    } finally {
      setLinkBusy(null);
    }
  };

  const revokeLink = async () => {
    setLinkBusy("revoke");
    try {
      await api<void>(`${base(projectId)}/links`, { method: "DELETE" });
      setLink(null);
      setCreated(null);
      toast.success("Review link turned off");
    } finally {
      setLinkBusy(null);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard is not available; select the link and copy it manually.");
    }
  };

  const setStatus = async (c: FeedbackCommentDto, status: "open" | "resolved") => {
    setBusyId(c.id);
    try {
      const r = await api<{ comment: FeedbackCommentDto }>(`${base(projectId)}/comments/${encodeURIComponent(c.id)}`, { method: "PATCH", json: { status } });
      setComments((list) => (list ?? []).map((x) => (x.id === c.id ? r.comment : x)));
    } catch (e) {
      toast.error(errorText(e, "Could not update the comment"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    await api<void>(`${base(projectId)}/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
    setComments((list) => (list ?? []).filter((x) => x.id !== id));
  };

  const fixWithAi = (c: FeedbackCommentDto) => {
    emit("codexa:ai-send", { text: fixPrompt(c), mode: "build" });
    toast.success("Sent to the agent", "Resolve the comment once the change looks right.");
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadComments();
    setRefreshing(false);
  };

  const all = comments ?? [];
  const openCount = all.filter((c) => c.status === "open").length;
  const shown = filter === "all" ? all : all.filter((c) => c.status === filter);

  return (
    <div className="space-y-6 px-5 py-4">
      {canEdit ? (
        <section aria-labelledby="feedback-link-heading" className="space-y-3">
          <div>
            <h3 id="feedback-link-heading" className="text-[13px] font-semibold">
              Review link
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Anyone with the link can view the app and leave comments, without a Codexa account. They see the published site, or the running preview if the app is not published yet.
            </p>
          </div>
          {link === undefined ? (
            <Skeleton className="h-9" />
          ) : created ? (
            <div className="rounded-lg border border-success/40 bg-success/5 p-3">
              <p className="text-xs font-medium">Link created. Copy it now; it is not shown again.</p>
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={created} aria-label="Review link" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-input px-2 font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => void copy()}>
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => setConfirm("revoke")}>
                  Revoke
                </Button>
              </div>
            </div>
          ) : link ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                <Badge variant="success" className="mr-2">
                  Active
                </Badge>
                Created {relativeTime(link.createdAt)}. The address is only shown when it is created.
              </p>
              <div className="flex gap-1.5">
                <Tooltip content="Makes a new link and turns the current one off">
                  <Button size="sm" variant="outline" loading={linkBusy === "create"} onClick={() => void createLink()}>
                    New link
                  </Button>
                </Tooltip>
                <Button size="sm" variant="ghost" onClick={() => setConfirm("revoke")}>
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" loading={linkBusy === "create"} onClick={() => void createLink()}>
              <Link2 className="size-4" aria-hidden="true" /> Create review link
            </Button>
          )}
        </section>
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section aria-labelledby="feedback-comments-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="feedback-comments-heading" className="flex items-center gap-2 text-[13px] font-semibold">
            Comments
            {openCount > 0 ? (
              <Badge variant="primary" className="tabular-nums">
                {openCount} open
              </Badge>
            ) : null}
          </h3>
          <div className="flex items-center gap-1.5">
            <Segmented<Filter>
              size="sm"
              aria-label="Show comments"
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: "open", label: "Open", count: openCount },
                { value: "resolved", label: "Resolved", count: all.length - openCount },
                { value: "all", label: "All" },
              ]}
            />
            <Tooltip content="Refresh">
              <Button size="icon" variant="ghost" className="size-8" aria-label="Refresh comments" onClick={() => void refresh()} disabled={refreshing}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {comments === null ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText aria-hidden="true" />}
            title={all.length === 0 ? "No comments yet" : filter === "open" ? "No open comments" : "Nothing here"}
            description={all.length === 0 ? "Share a review link with your client. Comments they pin to the app show up here." : filter === "open" ? "Everything has been resolved." : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {shown.map((c) => (
              <li key={c.id} className={cn("rounded-lg border border-border p-3", c.status === "resolved" && "bg-muted/40")}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-[13px] font-medium">{c.authorName}</p>
                  <time dateTime={c.createdAt} className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(c.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {c.pagePath}
                  {c.element ? ` · ${c.element.text ? `${c.element.tag} “${c.element.text}”` : `<${c.element.tag}>`}` : " · whole page"}
                </p>
                <p className={cn("mt-1.5 whitespace-pre-wrap break-words text-[13px]", c.status === "resolved" && "text-muted-foreground")}>{c.body}</p>
                {c.element ? (
                  <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground" title={c.element.path}>
                    {c.element.path}
                  </p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {c.status === "resolved" ? (
                    <Badge variant="success" className="mr-auto">
                      <CheckCircle2 aria-hidden="true" /> Resolved {c.resolvedAt ? relativeTime(c.resolvedAt) : ""}
                    </Badge>
                  ) : (
                    <span className="mr-auto" />
                  )}
                  {canEdit ? (
                    <>
                      {c.status === "open" ? (
                        <Button size="sm" variant="soft" onClick={() => fixWithAi(c)}>
                          <Sparkles className="size-4" aria-hidden="true" /> Fix with AI
                        </Button>
                      ) : null}
                      {c.status === "open" ? (
                        <Button size="sm" variant="outline" loading={busyId === c.id} onClick={() => void setStatus(c, "resolved")}>
                          <Check className="size-4" aria-hidden="true" /> Resolve
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" loading={busyId === c.id} onClick={() => void setStatus(c, "open")}>
                          <RotateCcw className="size-4" aria-hidden="true" /> Reopen
                        </Button>
                      )}
                      <Tooltip content="Delete comment">
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Delete comment by ${c.authorName}`} onClick={() => setConfirm({ deleteId: c.id })}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!canEdit ? <p className="text-xs text-muted-foreground">You have view access. Editors can create review links and act on comments.</p> : null}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "revoke" ? "Turn off the review link?" : "Delete this comment?"}
        description={confirm === "revoke" ? "Anyone using it will no longer be able to view the app or comment. Existing comments stay here." : "This cannot be undone."}
        confirmLabel={confirm === "revoke" ? "Revoke link" : "Delete"}
        destructive
        onConfirm={async () => {
          if (confirm === "revoke") await revokeLink();
          else if (confirm) await remove(confirm.deleteId);
        }}
      />
    </div>
  );
}

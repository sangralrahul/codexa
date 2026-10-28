"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, Globe, Link2Off, MessageSquarePlus, MessagesSquare, MousePointerClick, MonitorPlay, X } from "lucide-react";
import type { PublicCommentDto, ReviewTarget } from "@/lib/services/feedback";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { relativeTime } from "@/components/projects/format";

/**
 * Client review page. The app runs in an iframe (the live site opened with ?__codexa_review=1, or a
 * running preview); both carry the Codexa inspector, which this page drives over postMessage:
 *   → {type:"inspect", on}        comment mode (hover highlight, click to pick an element)
 *   ← {type:"select", element, page}
 *   → {type:"locate", items}      ← {type:"located", page, items:[{id, rect}]}   (comment pins)
 *   → {type:"reveal", path}       scroll a commented element into view
 */

type Rect = { x: number; y: number; width: number; height: number };
type Picked = { path: string; tag: string; text: string; html: string } | null;
type Located = { page: string; viewport: { width: number; height: number }; rects: Record<string, Rect | null> };

const NAME_KEY = "codexa:review-name";
const NAME_EVENT = "codexa:review-name";
const POLL_MS = 30_000;

// The reviewer's name, remembered in this browser (useSyncExternalStore keeps SSR and hydration in step).
function readName() {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
function subscribeName(cb: () => void) {
  window.addEventListener(NAME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(NAME_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function writeName(v: string) {
  try {
    window.localStorage.setItem(NAME_KEY, v.slice(0, 60));
  } catch {
    /* storage blocked: the name lasts for this page only */
  }
  window.dispatchEvent(new Event(NAME_EVENT));
}

const normPath = (p: string) => {
  const s = (p || "/").replace(/\/index\.html?$/i, "/").replace(/\/+$/, "");
  return s || "/";
};

/** The comments list is a side panel from lg up and a bottom sheet below that. */
const isWide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

const describeElement = (el: { tag: string; text: string }) => (el.text ? `${el.tag} “${el.text.length > 60 ? el.text.slice(0, 60) + "…" : el.text}”` : `<${el.tag}>`);

export function ReviewUnavailable() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <EmptyState
        icon={<Link2Off aria-hidden="true" />}
        title="This review link is not active"
        description="It may have been replaced or turned off by the person who shared it. Ask them for a new link."
        className="w-full max-w-md"
      />
    </main>
  );
}

export function ReviewClient({
  token,
  projectName,
  initialTarget,
  initialComments,
}: {
  token: string;
  projectName: string;
  initialTarget: ReviewTarget;
  initialComments: PublicCommentDto[];
}) {
  const [target, setTarget] = useState<ReviewTarget>(initialTarget);
  const [comments, setComments] = useState<PublicCommentDto[]>(initialComments);
  const [revoked, setRevoked] = useState(false);
  const name = useSyncExternalStore(subscribeName, readName, () => "");

  const frameRef = useRef<HTMLIFrameElement>(null);
  const [inspector, setInspector] = useState<"waiting" | "ready" | "missing">("waiting");
  const [commentMode, setCommentMode] = useState(false);
  const [picked, setPicked] = useState<Picked>(null);
  const [pickedPage, setPickedPage] = useState("/");
  const [located, setLocated] = useState<Located | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const frameUrl = target.kind === "none" ? null : target.url;
  const frameOrigin = useMemo(() => {
    try {
      return frameUrl ? new URL(frameUrl).origin : null;
    } catch {
      return null;
    }
  }, [frameUrl]);

  const toFrame = useCallback(
    (msg: Record<string, unknown>) => {
      const win = frameRef.current?.contentWindow;
      if (win && frameOrigin) win.postMessage({ source: "codexa-editor", ...msg }, frameOrigin);
    },
    [frameOrigin],
  );

  const locateItems = useMemo(() => comments.filter((c) => c.element).map((c) => ({ id: c.id, path: c.element!.path })), [comments]);
  const commentModeRef = useRef(commentMode);
  const locateRef = useRef(locateItems);
  useEffect(() => {
    commentModeRef.current = commentMode;
    locateRef.current = locateItems;
  }, [commentMode, locateItems]);

  // Messages from the inspector inside the frame.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || e.origin !== frameOrigin) return;
      const d = e.data as { source?: string; type?: string; [k: string]: unknown } | null;
      if (!d || d.source !== "codexa-inspector") return;
      if (d.type === "available") {
        // A fresh page load (navigation in the frame): restore pins and comment mode.
        setInspector("ready");
        toFrame({ type: "locate", items: locateRef.current });
        if (commentModeRef.current) toFrame({ type: "inspect", on: true });
      } else if (d.type === "select") {
        const el = d.element as { path?: string; tag?: string; text?: string; html?: string } | undefined;
        const path = typeof el?.path === "string" ? el.path : "";
        setPicked(path ? { path: path.slice(0, 600), tag: String(el?.tag ?? "element").slice(0, 40), text: String(el?.text ?? "").slice(0, 300), html: String(el?.html ?? "").slice(0, 900) } : null);
        if (typeof d.page === "string") setPickedPage(d.page);
        if (!isWide()) setSheetOpen(true);
      } else if (d.type === "deselect" || d.type === "escape") {
        setPicked(null);
      } else if (d.type === "located") {
        const items = Array.isArray(d.items) ? (d.items as { id: string; rect: Rect | null }[]) : [];
        const rects: Record<string, Rect | null> = {};
        for (const it of items) rects[it.id] = it.rect;
        const viewport = (d.viewport as Located["viewport"]) ?? { width: 0, height: 0 };
        setLocated({ page: typeof d.page === "string" ? d.page : "/", viewport, rects });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameOrigin, toFrame]);

  // New or removed comments: re-pin.
  useEffect(() => {
    if (inspector === "ready") toFrame({ type: "locate", items: locateItems });
  }, [locateItems, inspector, toFrame]);

  // If the page never announces the inspector, pinning is not available (say so; page comments still work).
  const onFrameLoad = () => {
    window.setTimeout(() => setInspector((s) => (s === "waiting" ? "missing" : s)), 4000);
  };

  // Keep the list fresh (other reviewers, resolved comments) and notice a revoked link.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/review/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (stopped) return;
        if (res.status === 404) return setRevoked(true);
        if (!res.ok) return;
        const data = (await res.json()) as { target: ReviewTarget; comments: PublicCommentDto[] };
        setComments(data.comments);
        setTarget((t) => (t.kind === data.target.kind && (t.kind === "none" || (data.target.kind !== "none" && t.url === data.target.url)) ? t : data.target));
      } catch {
        /* offline: try again on the next tick */
      }
    };
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [token]);

  const toggleComment = (on: boolean) => {
    setCommentMode(on);
    if (!on) setPicked(null);
    toFrame({ type: "inspect", on });
  };

  const clearPick = () => {
    setPicked(null);
    toFrame({ type: "deselect" });
  };

  const focusComment = (c: PublicCommentDto) => {
    setActiveId(c.id);
    if (c.element && located && normPath(located.page) === normPath(c.pagePath)) toFrame({ type: "reveal", path: c.element.path });
  };

  const onPosted = (c: PublicCommentDto) => {
    setComments((list) => [...list.filter((x) => x.id !== c.id), c]);
    setActiveId(c.id);
    setPicked(null);
    setCommentMode(false);
    toFrame({ type: "inspect", on: false });
  };

  // Pins for comments on the page the frame is showing, where their element is on screen.
  const pins = useMemo(() => {
    if (!located) return [];
    const out: { c: PublicCommentDto; n: number; rect: Rect }[] = [];
    comments.forEach((c, i) => {
      const rect = located.rects[c.id];
      if (!rect || !c.element || normPath(c.pagePath) !== normPath(located.page)) return;
      if (rect.y + rect.height < 0 || (located.viewport.height && rect.y > located.viewport.height)) return;
      out.push({ c, n: i + 1, rect });
    });
    return out;
  }, [comments, located]);
  const active = pins.find((p) => p.c.id === activeId) ?? null;

  if (revoked) return <ReviewUnavailable />;

  const panel = (idPrefix: string) => (
    <CommentsPanel
      idPrefix={idPrefix}
      token={token}
      comments={comments}
      name={name}
      picked={picked}
      pagePath={picked ? pickedPage : (located?.page ?? "/")}
      currentPage={located?.page ?? null}
      activeId={activeId}
      onClearPick={clearPick}
      onFocusComment={focusComment}
      onPosted={onPosted}
      commentMode={commentMode}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
        <LogoMark size={24} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{projectName}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {target.kind === "live" ? "Live site" : target.kind === "preview" ? "Work-in-progress preview" : "Not published yet"} · review and comment
          </p>
        </div>
        <label htmlFor="review-name-top" className="sr-only">
          Your name
        </label>
        <Input
          id="review-name-top"
          value={name}
          onChange={(e) => writeName(e.target.value)}
          placeholder="Leave your name"
          maxLength={60}
          autoComplete="name"
          className="hidden h-8 w-44 text-[13px] md:flex"
        />
        <Button
          size="sm"
          variant={commentMode ? "primary" : "outline"}
          aria-pressed={commentMode}
          disabled={!frameUrl || inspector === "missing"}
          onClick={() => toggleComment(!commentMode)}
          title={inspector === "missing" ? "Pinning comments is not available for this page" : undefined}
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" /> {commentMode ? "Commenting" : "Comment"}
        </Button>
        <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setSheetOpen(true)} aria-label={`Comments (${comments.length})`}>
          <MessagesSquare className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{comments.length}</span>
        </Button>
        <Badge variant="outline" className="hidden tabular-nums lg:inline-flex">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </Badge>
      </header>

      {target.kind === "preview" ? (
        <p className="shrink-0 border-b border-border bg-surface px-4 py-1.5 text-xs text-muted-foreground">
          <MonitorPlay className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden="true" />
          This is a live preview of work in progress. If it stops loading, the preview has gone to sleep; ask the person who shared this link to open the project again.
        </p>
      ) : null}
      {commentMode ? (
        <p role="status" className="shrink-0 border-b border-border bg-primary/5 px-4 py-1.5 text-xs text-foreground">
          <MousePointerClick className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Click any part of the app to pin a comment to it. Press Esc in the app or turn off Comment to browse normally.
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-0 overflow-hidden bg-muted/40">
          {frameUrl ? (
            <>
              <iframe
                key={frameUrl}
                ref={frameRef}
                src={frameUrl}
                title={`${projectName} (app under review)`}
                onLoad={onFrameLoad}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                referrerPolicy="no-referrer"
                className="absolute inset-0 size-full border-0 bg-white"
              />
              <div className="pointer-events-none absolute inset-0" aria-hidden={pins.length === 0}>
                {active ? (
                  <div
                    className="absolute rounded-[3px] border-2 border-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
                    style={{ left: active.rect.x, top: active.rect.y, width: active.rect.width, height: active.rect.height }}
                  />
                ) : null}
                {pins.map(({ c, n, rect }) => {
                  const vw = located?.viewport.width || 10_000;
                  const left = Math.min(Math.max(rect.x + rect.width - 12, 4), vw - 28);
                  const top = Math.max(rect.y - 12, 4);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveId(c.id);
                        if (!isWide()) setSheetOpen(true);
                        document.getElementById(`${isWide() ? "review-side" : "review-sheet"}-comment-${c.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                      }}
                      aria-label={`Comment ${n} by ${c.authorName}`}
                      className={cn(
                        "pointer-events-auto absolute flex size-6 items-center justify-center rounded-full rounded-bl-none border-2 border-background bg-primary text-[11px] font-semibold text-primary-foreground shadow-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                        c.id === activeId && "scale-110 ring-2 ring-primary/40",
                      )}
                      style={{ left, top }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-4">
              <EmptyState
                icon={<Globe aria-hidden="true" />}
                title="Nothing to show yet"
                description="This app has not been published and no preview is running right now. You can still leave a comment; ask the person who shared this link to publish the app so you can pin comments to it."
                className="w-full max-w-md"
              />
            </div>
          )}
          {frameUrl && inspector === "missing" ? (
            <div className="absolute inset-x-3 bottom-3 sm:left-auto sm:max-w-sm">
              <Alert variant="info" title="Pinning is not available on this page">
                The page did not load the review tools (it may still be loading, or the preview is asleep). Comments you leave are attached to the page.
              </Alert>
            </div>
          ) : null}
        </div>

        <aside aria-label="Comments" className="hidden min-h-0 flex-col border-l border-border bg-card lg:flex">
          {panel("review-side")}
        </aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" title={`Comments (${comments.length})`} className="lg:hidden" bodyClassName="p-0">
          <div className="flex max-h-[70dvh] flex-col">{panel("review-sheet")}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CommentsPanel({
  idPrefix,
  token,
  comments,
  name,
  picked,
  pagePath,
  currentPage,
  activeId,
  commentMode,
  onClearPick,
  onFocusComment,
  onPosted,
}: {
  idPrefix: string;
  token: string;
  comments: PublicCommentDto[];
  name: string;
  picked: Picked;
  pagePath: string;
  currentPage: string | null;
  activeId: string | null;
  commentMode: boolean;
  onClearPick: () => void;
  onFocusComment: (c: PublicCommentDto) => void;
  onPosted: (c: PublicCommentDto) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [posted, setPosted] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (picked) bodyRef.current?.focus();
  }, [picked]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    if (!body.trim()) {
      bodyRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/review/${encodeURIComponent(token)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name.trim(), body: body.trim(), pagePath: pagePath.startsWith("/") ? pagePath.slice(0, 500) : "/", element: picked }),
      });
      const data = (await res.json().catch(() => ({}))) as { comment?: PublicCommentDto; error?: { message?: string } };
      if (res.status === 404) throw new Error("This review link has been turned off.");
      if (!res.ok || !data.comment) throw new Error(data.error?.message ?? "Could not post your comment. Try again.");
      setBody("");
      setPosted(true);
      window.setTimeout(() => setPosted(false), 2500);
      onPosted(data.comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your comment. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={submit} className="space-y-2.5 border-b border-border p-4" aria-label="New comment">
        <div className="md:hidden">
          <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-[13px] font-medium">
            Your name
          </label>
          <Input
            id={`${idPrefix}-name`}
            ref={nameRef}
            value={name}
            onChange={(e) => {
              writeName(e.target.value);
              setNameError(false);
            }}
            placeholder="Leave your name"
            maxLength={60}
            autoComplete="name"
            aria-invalid={nameError || undefined}
            className="h-9 text-[13px]"
          />
        </div>
        <div className="flex items-start justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-xs">
          {picked ? (
            <>
              <span className="min-w-0">
                <span className="text-muted-foreground">Pinned to </span>
                <span className="break-words font-medium">{describeElement(picked)}</span>
                {pagePath !== "/" ? <span className="text-muted-foreground"> on {pagePath}</span> : null}
              </span>
              <button type="button" onClick={onClearPick} className="-m-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Remove the pinned element">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <span className="text-muted-foreground">
              {commentMode ? "Click part of the app to pin this comment, or write a comment about the whole page." : "Comment about the whole page, or press Comment and click part of the app to pin it."}
            </span>
          )}
        </div>
        <label htmlFor={`${idPrefix}-body`} className="sr-only">
          Comment
        </label>
        <Textarea id={`${idPrefix}-body`} ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should change?" maxLength={2000} rows={3} className="text-[13px]" />
        {nameError ? (
          <p role="alert" className="text-xs text-danger">
            Add your name so the team knows who left the comment.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span role="status" className="text-xs text-success">
            {posted ? (
              <>
                <Check className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                Comment posted
              </>
            ) : null}
          </span>
          <Button type="submit" size="sm" loading={busy} disabled={!body.trim()}>
            Post comment
          </Button>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">Your name and comment are visible to everyone with this link and to the app&apos;s team.</p>
      </form>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No comments yet. Yours will be the first.</p>
        ) : (
          <ol className="divide-y divide-border">
            {comments.map((c, i) => {
              const elsewhere = currentPage !== null && normPath(c.pagePath) !== normPath(currentPage);
              return (
                <li key={c.id} id={`${idPrefix}-comment-${c.id}`}>
                  <button
                    type="button"
                    onClick={() => onFocusComment(c)}
                    aria-current={c.id === activeId ? "true" : undefined}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none", c.id === activeId && "bg-primary/5")}
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full rounded-bl-none bg-primary text-[11px] font-semibold text-primary-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium">{c.authorName}</span>
                        <time dateTime={c.createdAt} className="shrink-0 text-[11px] text-muted-foreground">
                          {relativeTime(c.createdAt)}
                        </time>
                      </span>
                      {c.element || c.pagePath !== "/" ? (
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {c.element ? describeElement(c.element) : "Whole page"}
                          {c.pagePath !== "/" ? ` · ${c.pagePath}` : ""}
                          {elsewhere ? " (another page)" : ""}
                        </span>
                      ) : null}
                      <span className="mt-1 block whitespace-pre-wrap break-words text-[13px] text-foreground/90">{c.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

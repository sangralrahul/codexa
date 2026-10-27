"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { projectsApi, shareApi } from "@/lib/client/workspace/api";
import type { ProjectVisibility, ShareLinkDto } from "@/lib/client/workspace/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { Alert, Skeleton } from "@/components/ui/misc";
import { relativeTime } from "@/components/projects/format";

export function ShareDialog({
  projectId,
  open,
  onOpenChange,
  visibility,
  onVisibilityChange,
  canEdit,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  visibility: ProjectVisibility;
  onVisibilityChange: (v: ProjectVisibility) => void;
  canEdit: boolean;
}) {
  const [links, setLinks] = useState<ShareLinkDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<"view" | "edit">("view");
  const [expires, setExpires] = useState<string>("7");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ url: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingVis, setSavingVis] = useState(false);

  useEffect(() => {
    if (!open || !canEdit) return;
    let cancelled = false;
    shareApi
      .list(projectId)
      .then((r) => !cancelled && setLinks(r.links))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load share links"));
    return () => {
      cancelled = true;
    };
  }, [open, projectId, canEdit]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await shareApi.create(projectId, { access, expiresInDays: expires === "never" ? null : Number(expires) });
      setCreated({ url: res.url, id: res.link.id });
      setLinks((l) => [res.link, ...(l ?? [])]);
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create link");
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard is not available; select the link text and copy it manually.");
    }
  };

  const revoke = async (id: string) => {
    try {
      await shareApi.revoke(projectId, id);
      setLinks((l) => (l ?? []).filter((x) => x.id !== id));
      if (created?.id === id) setCreated(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Share project" description="Share links open a read-only copy of the files for anyone with the link." className="[--btn-radius:10px]">
        <div className="space-y-5">
          <Field label="Visibility" htmlFor="share-visibility" hint="Private: workspace members only. Unlisted/public: readable by anyone with a share link.">
            <Select
              id="share-visibility"
              value={visibility}
              disabled={!canEdit || savingVis}
              onChange={async (e) => {
                const v = e.target.value as ProjectVisibility;
                setSavingVis(true);
                try {
                  await projectsApi.patch(projectId, { visibility: v });
                  onVisibilityChange(v);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not update visibility");
                } finally {
                  setSavingVis(false);
                }
              }}
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </Select>
          </Field>

          {!canEdit ? (
            <p className="text-sm text-muted-foreground">Only editors can create share links.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Access" htmlFor="share-access">
                  <Select id="share-access" value={access} onChange={(e) => setAccess(e.target.value as "view" | "edit")}>
                    <option value="view">View only</option>
                    <option value="edit">Edit (reserved for live collaboration)</option>
                  </Select>
                </Field>
                <Field label="Expires" htmlFor="share-expires">
                  <Select id="share-expires" value={expires} onChange={(e) => setExpires(e.target.value)}>
                    <option value="1">In 1 day</option>
                    <option value="7">In 7 days</option>
                    <option value="30">In 30 days</option>
                    <option value="never">Never</option>
                  </Select>
                </Field>
                <Button onClick={() => void create()} loading={creating}>
                  <Link2 className="size-4" /> Create link
                </Button>
              </div>
              {created ? (
                <div className="rounded-lg border border-success/40 bg-success/5 p-3">
                  <p className="text-xs font-medium">Link created. Copy it now; it is not shown again.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input readOnly value={created.url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-input px-2 font-mono text-xs" />
                    <Button size="sm" variant="outline" onClick={() => void copy()}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              ) : null}
              {error ? <Alert variant="danger">{error}</Alert> : null}
              <div>
                <h3 className="mb-2 text-[13px] font-semibold">Active links</h3>
                {!links ? (
                  <Skeleton className="h-10" />
                ) : links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active links.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {links.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant={l.access === "edit" ? "warning" : "default"} className="text-[10px] capitalize">
                            {l.access}
                          </Badge>
                          <span className="text-muted-foreground">created {relativeTime(l.createdAt)}</span>
                          <span className="text-muted-foreground">{l.expiresAt ? `expires ${new Date(l.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "never expires"}</span>
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => void revoke(l.id)} aria-label="Revoke link">
                          <Trash2 className="size-4" /> Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

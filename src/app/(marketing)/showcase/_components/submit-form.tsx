"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";

type ProjectOption = { id: string; name: string };
type Props = { workspaceId: string | null; workspaceName: string | null };

type Status = { kind: "idle" } | { kind: "ok"; slug: string; title: string } | { kind: "error"; message: string; details?: Record<string, string> };

/**
 * Submit one of your projects to the community showcase. Lists the current
 * workspace's projects through GET /api/v1/projects; if that fails (or there is
 * no workspace) a plain project-id input is shown instead.
 */
export function ShowcaseSubmitForm({ workspaceId, workspaceName }: Props) {
  const [projects, setProjects] = useState<ProjectOption[] | null>(workspaceId ? null : []);
  const [listFailed, setListFailed] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    api<{ projects: { id: string; name: string }[] }>(`/api/v1/projects?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((res) => {
        if (cancelled) return;
        setProjects(res.projects.map((p) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {
        if (cancelled) return;
        setListFailed(true);
        setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const useSelect = Boolean(workspaceId) && !listFailed && projects !== null && projects.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const res = await api<{ entry: { slug: string; title: string } }>("/api/v1/showcase", {
        method: "POST",
        json: {
          projectId: projectId.trim(),
          title: title.trim(),
          description: description.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          liveUrl: liveUrl.trim(),
        },
      });
      setStatus({ kind: "ok", slug: res.entry.slug, title: res.entry.title });
      setTitle("");
      setDescription("");
      setTags("");
      setLiveUrl("");
    } catch (err) {
      if (err instanceof ClientApiError) {
        const details = err.fieldErrors();
        const message =
          err.status === 401
            ? "Your session has expired. Sign in again to submit."
            : err.status === 403
              ? "You need the editor role on that project to submit it."
              : err.status === 404
                ? "That project could not be found."
                : err.status === 429
                  ? "Too many submissions. Try again later."
                  : err.message;
        setStatus({ kind: "error", message, details });
      } else {
        setStatus({ kind: "error", message: "Could not submit the project. Check your connection and try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (name: string) => (status.kind === "error" ? (status.details?.[name] ?? null) : null);

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-describedby="submit-help" noValidate>
      <p id="submit-help" className="text-sm text-muted-foreground">
        Submissions are reviewed by the Codexa team before they appear publicly. Only the title, description, tags and live URL you enter are published; project files stay private.
      </p>
      {status.kind === "ok" ? (
        <Alert variant="success" title="Submitted for review">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            “{status.title}” is pending review. It will appear at <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">/showcase/{status.slug}</code> once approved.
          </span>
        </Alert>
      ) : null}
      {status.kind === "error" ? (
        <Alert variant="danger" title="Could not submit">
          {status.message}
        </Alert>
      ) : null}

      <Field label="Project" htmlFor="showcase-project" hint={useSelect ? `Projects in ${workspaceName ?? "your workspace"}.` : "Paste the project id from the editor URL (/projects/<id>)."} error={fieldError("projectId")}>
        {useSelect ? (
          <Select id="showcase-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} required aria-invalid={fieldError("projectId") ? true : undefined}>
            <option value="">Select a project…</option>
            {projects!.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input id="showcase-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Project id" required aria-invalid={fieldError("projectId") ? true : undefined} />
        )}
      </Field>
      {workspaceId && projects === null ? (
        <p className="text-xs text-muted-foreground" role="status">
          Loading your projects…
        </p>
      ) : null}
      {workspaceId && projects !== null && projects.length === 0 && !listFailed ? (
        <p className="text-xs text-muted-foreground">
          No projects in this workspace yet.{" "}
          <Link href="/new-project" className="link-draw text-foreground">
            Create one
          </Link>{" "}
          first, or paste an id from another workspace.
        </p>
      ) : null}

      <Field label="Title" htmlFor="showcase-title" error={fieldError("title")}>
        <Input id="showcase-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required placeholder="What is it called?" aria-invalid={fieldError("title") ? true : undefined} />
      </Field>
      <Field label="Description" htmlFor="showcase-description" hint="At least 20 characters. What does it do, who is it for, what did Codexa help with?" error={fieldError("description")}>
        <Textarea id="showcase-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} required aria-invalid={fieldError("description") ? true : undefined} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tags" htmlFor="showcase-tags" hint="Comma separated, up to 8." error={fieldError("tags")}>
          <Input id="showcase-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, dashboard, internal-tool" />
        </Field>
        <Field label="Live URL (optional)" htmlFor="showcase-url" hint="A deployed URL visitors can open." error={fieldError("liveUrl")}>
          <Input id="showcase-url" type="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://" inputMode="url" aria-invalid={fieldError("liveUrl") ? true : undefined} />
        </Field>
      </div>
      <Button type="submit" loading={busy} disabled={busy}>
        {busy ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Globe, Rocket, TriangleAlert } from "lucide-react";
import { ApiError, deployApi, type Deployment, type Provider } from "../../lib/api";
import { cn, relativeTime } from "../../lib/util";
import { Badge, Button, Dialog, Spinner } from "../../ui";

const ACTIVE = new Set(["queued", "building", "deploying"]);
const STEP_LABEL: Record<string, string> = { queued: "Queued", building: "Building your app", deploying: "Putting it online" };
const STEPS = [
  { label: "Build", status: ["queued", "building"] },
  { label: "Deploy", status: ["deploying"] },
  { label: "Live", status: ["live"] },
];

/** Publish to Codexa hosting: start a deployment, follow it to live (or failed), then share the link. */
export function PublishDialog({ projectId, open, onClose, canPublish }: { projectId: string; open: boolean; onClose: () => void; canPublish: boolean }) {
  const [list, setList] = useState<{ deployments: Deployment[]; providers: Provider[] } | null>(null);
  const [tracking, setTracking] = useState<Deployment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fresh state each time the dialog opens
    setError(null);
    deployApi
      .list(projectId)
      .then((r) => {
        setList(r);
        const running = r.deployments.find((d) => ACTIVE.has(d.status));
        if (running) setTracking(running);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load deployments"));
  }, [open, projectId]);

  useEffect(() => {
    if (!tracking || !ACTIVE.has(tracking.status)) return;
    timer.current = setInterval(async () => {
      try {
        const { deployment } = await deployApi.get(projectId, tracking.id);
        setTracking(deployment);
        if (!ACTIVE.has(deployment.status)) setList((l) => (l ? { ...l, deployments: [deployment, ...l.deployments.filter((d) => d.id !== deployment.id)] } : l));
      } catch {
        // keep polling
      }
    }, 2500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [tracking, projectId]);

  const codexa = list?.providers.find((p) => p.id === "codexa");
  const live = list?.deployments.find((d) => d.status === "live" && d.url);
  const busy = tracking ? ACTIVE.has(tracking.status) : false;

  const publish = async () => {
    setError(null);
    try {
      const { deployment } = await deployApi.create(projectId);
      setTracking(deployment);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start publishing");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Publish" description="Put your app on the web with Codexa hosting. Every publish is a new version you can roll back on the web." width={480}>
      {!list && !error ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {live && !busy ? (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Badge tone="success">
                  <span className="size-1.5 rounded-full bg-success" /> Live
                </Badge>
                <span className="text-[12px] text-muted">Published {relativeTime(live.createdAt)}</span>
              </div>
              <p className="selectable mt-2.5 truncate font-mono text-[13px]">{live.url}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => void window.codexa.openExternal(live.url!)}>
                  <ExternalLink /> Open
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(live.url!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
          ) : null}

          {busy && tracking ? (
            <div className="rounded-xl border border-border p-4">
              <ol className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                  const idx = STEPS.findIndex((x) => x.status.includes(tracking.status));
                  const state = i < idx ? "done" : i === idx ? "active" : "next";
                  return (
                    <li key={s.label} className="flex min-w-0 flex-1 items-center gap-2">
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", state === "done" ? "bg-success text-white" : state === "active" ? "bg-accent text-white" : "bg-surface text-dim ring-1 ring-border")}>
                        {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <Spinner className="size-3.5 text-white" /> : i + 1}
                      </span>
                      <span className={cn("truncate text-[12.5px] font-medium", state === "next" ? "text-dim" : "text-fg")}>{s.label}</span>
                      {i < STEPS.length - 1 ? <span className={cn("h-px min-w-4 flex-1", state === "done" ? "bg-success" : "bg-border")} /> : null}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-[12.5px] text-muted">
                {STEP_LABEL[tracking.status] ?? "Publishing"}… this usually takes under a minute. You can keep working.
              </p>
            </div>
          ) : null}

          {tracking && tracking.status === "failed" ? (
            <p className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> The build failed{tracking.error ? `: ${tracking.error}` : "."} Check the code or ask the AI to fix it, then try again.
            </p>
          ) : null}

          {codexa && !codexa.available ? (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-[13px] text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {codexa.reason ?? "Codexa hosting isn't available on this server."}
            </p>
          ) : null}
          {error ? (
            <p className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => void window.codexa.openWeb(`/projects/${projectId}?panel=publishing`)}>
              <Globe /> Domains & history
            </Button>
            <Button variant="accent" onClick={() => void publish()} loading={busy} disabled={!canPublish || (codexa ? !codexa.available : false)}>
              <Rocket /> {live ? "Publish update" : "Publish"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

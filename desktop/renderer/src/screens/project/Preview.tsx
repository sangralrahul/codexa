import { useState } from "react";
import { CloudOff, ExternalLink, Monitor, Play, RotateCw, Smartphone, Tablet, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/util";
import { Button, Spinner } from "../../ui";
import type { RuntimeView } from "./useRuntime";

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 820 },
  { id: "phone", label: "Phone", icon: Smartphone, width: 390 },
] as const;

export function Preview({ runtime, reloadKey }: { runtime: RuntimeView; reloadKey: number }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [nonce, setNonce] = useState(0);
  const width = DEVICES.find((d) => d.id === device)?.width ?? null;
  const url = runtime.previewUrl;
  const starting = runtime.status === "starting" || (runtime.status === "stopped" && runtime.busy);
  const dot = url ? "bg-success" : starting ? "pulse bg-warning" : runtime.status === "error" ? "bg-danger" : "bg-dim";
  const label = url ? url.replace(/^https?:\/\//, "") : starting ? "Starting your app…" : runtime.status === "error" ? "Stopped with an error" : runtime.status === "unavailable" ? "Previews unavailable" : "Not running";

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <Button variant="ghost" size="icon-sm" aria-label="Reload preview" title="Reload" disabled={!url} onClick={() => setNonce((n) => n + 1)}>
          <RotateCw />
        </Button>
        <div className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 font-mono text-[12px] text-muted">
          <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
          <span className="truncate">{label}</span>
          {url ? <span className="ml-auto hidden shrink-0 font-sans text-[11px] text-dim lg:inline">Updates as you save</span> : null}
        </div>
        {!url && !starting && runtime.status !== "unavailable" && runtime.status !== "loading" ? (
          <Button size="sm" variant="primary" className="h-7" loading={runtime.busy} onClick={() => void (runtime.status === "error" ? runtime.restart() : runtime.start())}>
            <Play /> {runtime.status === "error" ? "Restart" : "Run"}
          </Button>
        ) : null}
        <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Device size">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-label={d.label}
              aria-pressed={device === d.id}
              title={d.label}
              onClick={() => setDevice(d.id)}
              className={cn("flex size-6 items-center justify-center rounded-[5px] [&_svg]:size-3.5", device === d.id ? "bg-surface text-fg" : "text-dim hover:text-fg")}
            >
              <d.icon />
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Open preview in browser" title="Open in browser" disabled={!url} onClick={() => url && void window.codexa.openExternal(url)}>
          <ExternalLink />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-3">
        {url ? (
          <div className={cn("mx-auto h-full overflow-hidden bg-white shadow-card", width ? "rounded-2xl border border-border" : "rounded-xl border border-border")} style={width ? { width, maxWidth: "100%" } : undefined}>
            <iframe key={`${url}#${nonce}#${reloadKey}`} src={url} title="App preview" className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <PreviewState runtime={runtime} />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewState({ runtime }: { runtime: RuntimeView }) {
  const { status, error } = runtime;
  if (status === "loading" || status === "starting" || (status === "stopped" && runtime.busy)) {
    return (
      <div className="fade-in w-[340px] max-w-full rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <Spinner className="mx-auto size-5" />
        <p className="mt-4 text-[14px] font-medium">Starting your app…</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Installing packages and starting the dev server. This usually takes a few seconds the first time; the console (Ctrl J) shows the output.</p>
      </div>
    );
  }
  if (status === "unavailable") {
    return (
      <div className="fade-in flex w-[420px] max-w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
        <CloudOff className="size-4 shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">Preview service unavailable</span>
          <span className="block truncate text-[12px] text-muted" title={error ?? undefined}>
            {error && error.length > 40 ? error : "Files, chat and publishing still work."}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => void runtime.refresh()}>
          Retry
        </Button>
      </div>
    );
  }
  if (status === "error") {
    return (
      <Card
        icon={<TriangleAlert />}
        title="The preview stopped"
        body={error ?? "The dev server exited. Check the console (Ctrl J) or ask the AI to fix it."}
        action={
          <Button variant="primary" onClick={() => void runtime.restart()} loading={runtime.busy}>
            <Play /> Restart
          </Button>
        }
      />
    );
  }
  return (
    <Card
      icon={<Play />}
      title="Run your app"
      body={error ?? "Start a live preview on Codexa's servers. It reloads every time you or the AI save a file."}
      action={
        <Button variant="primary" onClick={() => void runtime.start()} loading={runtime.busy}>
          <Play /> Run
        </Button>
      }
    />
  );
}

function Card({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="fade-in w-[380px] max-w-full rounded-2xl border border-border bg-card p-7 text-center shadow-card">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-muted [&_svg]:size-5">{icon}</div>
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
      <div className="mt-5 flex justify-center">{action}</div>
    </div>
  );
}

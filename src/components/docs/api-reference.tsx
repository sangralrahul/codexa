import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/content/code-block";
import type { EndpointGroup, ResolvedEndpoint } from "@/lib/content/api-registry";
import { cn } from "@/lib/utils";

const METHOD_TONE: Record<string, string> = {
  GET: "bg-info/10 text-info border-info/30",
  POST: "bg-success/10 text-success border-success/30",
  PUT: "bg-warning/10 text-warning border-warning/30",
  PATCH: "bg-warning/10 text-warning border-warning/30",
  DELETE: "bg-danger/10 text-danger border-danger/30",
};

const AUTH_LABEL: Record<ResolvedEndpoint["auth"], string> = {
  none: "Public",
  session: "Session cookie",
  admin: "Staff session",
  "webhook-signature": "Provider signature",
};

export function MethodBadge({ method }: { method: string }) {
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold", METHOD_TONE[method] ?? "border-border")}>{method}</span>;
}

export function EndpointRow({ e }: { e: ResolvedEndpoint }) {
  const planned = e.resolvedStatus === "planned";
  return (
    <li id={e.id} className={cn("scroll-mt-24 rounded-lg border border-border p-4", planned && "border-dashed opacity-80")}>
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={e.method} />
        <code className="break-all font-mono text-sm">{e.path}</code>
        <Badge variant={planned ? "outline" : "success"} className="ml-auto">
          {planned ? "Planned" : "Implemented"}
        </Badge>
      </div>
      <p className="mt-2 text-sm">{e.summary}</p>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>
          <dt className="inline font-medium">Auth: </dt>
          <dd className="inline">{AUTH_LABEL[e.auth]}</dd>
        </div>
        {e.role ? (
          <div>
            <dt className="inline font-medium">Minimum role: </dt>
            <dd className="inline capitalize">{e.role}</dd>
          </div>
        ) : null}
      </dl>
      {e.notes ? <p className="mt-2 text-xs text-muted-foreground">{e.notes}</p> : null}
      {e.request || e.response ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-primary">Request and response</summary>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {e.request ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Request body</p>
                <CodeBlock language="json" className="my-0">
                  <code className="hljs language-json">{e.request}</code>
                </CodeBlock>
              </div>
            ) : null}
            {e.response ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Response</p>
                <CodeBlock language="json" className="my-0">
                  <code className="hljs language-json">{e.response}</code>
                </CodeBlock>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </li>
  );
}

export function ApiReference({ groups }: { groups: { id: EndpointGroup; title: string; description: string; endpoints: ResolvedEndpoint[] }[] }) {
  return (
    <div className="space-y-12">
      {groups.map((g) => (
        <section key={g.id} id={`group-${g.id}`} aria-labelledby={`h-${g.id}`} className="scroll-mt-24">
          <h2 id={`h-${g.id}`} className="text-xl font-semibold tracking-tight">
            {g.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
          <ul className="mt-4 space-y-3">
            {g.endpoints.map((e) => (
              <EndpointRow key={e.id} e={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import { Check, ChevronRight, CircleDashed } from "lucide-react";
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
  return <span className={cn("inline-flex h-6 min-w-[3.75rem] items-center justify-center rounded-md border px-1.5 font-mono text-[11px] font-semibold tracking-wide", METHOD_TONE[method] ?? "border-border")}>{method}</span>;
}

export function EndpointRow({ e }: { e: ResolvedEndpoint }) {
  const planned = e.resolvedStatus === "planned";
  return (
    <li
      id={e.id}
      className={cn(
        "group scroll-mt-24 rounded-[16px] border p-4 transition-[border-color,box-shadow] duration-(--dur-2) target:border-signal target:shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)] sm:p-5",
        planned ? "border-dashed border-border-strong bg-transparent" : "border-border bg-card shadow-[inset_0_1px_0_var(--hairline)] hover:border-border-strong",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <MethodBadge method={e.method} />
        <code className="min-w-0 break-all border-0 bg-transparent p-0 font-mono text-[13.5px] font-medium">{e.path}</code>
        <span
          className={cn(
            "ml-auto inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium",
            planned ? "border border-dashed border-border-strong text-muted-foreground" : "bg-success/12 text-success",
          )}
        >
          {planned ? <CircleDashed className="size-3" aria-hidden="true" /> : <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />}
          {planned ? "Planned" : "Implemented"}
        </span>
      </div>
      <p className="mt-2.5 text-[14.5px] leading-relaxed">{e.summary}</p>
      <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <dt className="text-foreground-dim">Auth</dt>
          <dd>{AUTH_LABEL[e.auth]}</dd>
        </div>
        {e.role ? (
          <div className="flex items-center gap-1.5">
            <dt className="text-foreground-dim">Minimum role</dt>
            <dd className="capitalize">{e.role}</dd>
          </div>
        ) : null}
      </dl>
      {e.notes ? <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{e.notes}</p> : null}
      {e.request || e.response ? (
        <details className="group/ex mt-3.5 border-t border-border pt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-[13px] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3.5 transition-transform duration-(--dur-2) group-open/ex:rotate-90" aria-hidden="true" />
            Request and response
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {e.request ? (
              <CodeBlock title="Request body" className="my-0">
                <code className="hljs language-json">{e.request}</code>
              </CodeBlock>
            ) : null}
            {e.response ? (
              <CodeBlock title="Response" className="my-0">
                <code className="hljs language-json">{e.response}</code>
              </CodeBlock>
            ) : null}
          </div>
        </details>
      ) : null}
    </li>
  );
}

export function ApiReference({ groups }: { groups: { id: EndpointGroup; title: string; description: string; endpoints: ResolvedEndpoint[] }[] }) {
  return (
    <div className="space-y-14">
      {groups.map((g) => {
        const done = g.endpoints.filter((e) => e.resolvedStatus === "implemented").length;
        return (
          <section key={g.id} id={`group-${g.id}`} aria-labelledby={`h-${g.id}`} className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
              <h2 id={`h-${g.id}`} className="text-[21px] font-semibold tracking-[-0.015em]">
                {g.title}
              </h2>
              <span className="font-mono text-[11.5px] text-muted-foreground">
                {done}/{g.endpoints.length} implemented
              </span>
            </div>
            <p className="mt-2.5 text-sm text-muted-foreground">{g.description}</p>
            <ul className="mt-5 space-y-3">
              {g.endpoints.map((e) => (
                <EndpointRow key={e.id} e={e} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

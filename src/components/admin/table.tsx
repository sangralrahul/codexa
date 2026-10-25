import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav aria-label="Breadcrumb" className="mb-1 text-xs text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          {title !== "Overview" ? <span> / {title}</span> : null}
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatTile({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "default" | "warning" | "danger" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "danger" ? "border-danger/40" : tone === "warning" ? "border-warning/40" : "border-border")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Table({ children, className, caption }: { children: React.ReactNode; className?: string; caption: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-card", className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className, title }: { children?: React.ReactNode; className?: string; title?: string }) {
  return (
    <td className={cn("border-b border-border px-3 py-2 align-top last:border-b-0", className)} title={title}>
      {children}
    </td>
  );
}
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[12px]", className)}>{children}</code>;
}

export function When({ value }: { value: Date | string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const d = typeof value === "string" ? new Date(value) : value;
  return <time dateTime={d.toISOString()}>{d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "default" | "primary"> = {
  active: "success",
  live: "success",
  succeeded: "success",
  running: "primary",
  starting: "primary",
  queued: "default",
  building: "primary",
  deploying: "primary",
  trialing: "success",
  past_due: "warning",
  in_progress: "warning",
  incomplete: "warning",
  open: "warning",
  failed: "danger",
  error: "danger",
  canceled: "default",
  cancelled: "default",
  closed: "default",
  stopped: "default",
  rolled_back: "default",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_TONE[status] ?? "default"} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

/** Offset pagination driven by a `page` search param; other params are preserved. */
export function Pagination({ page, pageSize, total, basePath, params }: { page: number; pageSize: number; total: number; basePath: string; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {total.toLocaleString("en-US")} result{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={buttonClasses("outline", "sm")} rel="prev">
            <ChevronLeft className="size-4" aria-hidden="true" /> Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className={buttonClasses("outline", "sm")} rel="next">
            Next <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** Plain GET filter form (works without JavaScript). */
export function FilterForm({ action, fields, values }: { action: string; fields: { name: string; label: string; type?: "text" | "select"; options?: { value: string; label: string }[]; placeholder?: string }[]; values: Record<string, string | undefined> }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-2" role="search">
      {fields.map((f) => (
        <div key={f.name} className="min-w-[10rem] flex-1 sm:flex-none">
          <label htmlFor={`f-${f.name}`} className="mb-1 block text-xs font-medium text-muted-foreground">
            {f.label}
          </label>
          {f.type === "select" ? (
            <Select id={`f-${f.name}`} name={f.name} defaultValue={values[f.name] ?? ""} className="h-9">
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input id={`f-${f.name}`} name={f.name} defaultValue={values[f.name] ?? ""} placeholder={f.placeholder} className="h-9" />
          )}
        </div>
      ))}
      <Button type="submit" size="sm" variant="outline" className="h-9">
        Apply
      </Button>
      <Link href={action} className={buttonClasses("ghost", "sm", "h-9")}>
        Reset
      </Link>
    </form>
  );
}

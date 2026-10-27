import Link from "next/link";
import { FolderKanban, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UsageContributor } from "@/lib/services/usage-history";
import { Avatar } from "@/components/ui/avatar";
import { tableHead, tableRow } from "./section";

const nf = (n: number) => n.toLocaleString("en-US");

/** Top contributors this period (projects or people), with a share bar on AI requests. Real rows only. */
export function UsageBreakdown({ kind, rows }: { kind: "projects" | "members"; rows: UsageContributor[] }) {
  const Icon = kind === "projects" ? FolderKanban : Users;
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center px-6 pb-8 pt-4 text-center">
        <span className="icon-tile flex size-9 items-center justify-center rounded-[10px]">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-medium">{kind === "projects" ? "No project activity yet this period" : "No one has used metered features yet"}</p>
        <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">Rows appear as AI requests, preview minutes and deployments are recorded.</p>
      </div>
    );
  }
  const maxAi = Math.max(1, ...rows.map((r) => r.ai));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-sm sm:min-w-[420px]">
        <thead>
          <tr className="border-t border-border/80">
            <th scope="col" className={cn(tableHead, "pl-5 sm:pl-6")}>
              {kind === "projects" ? "Project" : "Member"}
            </th>
            <th scope="col" className={cn(tableHead, "text-right")}>
              AI
            </th>
            <th scope="col" className={cn(tableHead, "text-right")}>
              Preview
            </th>
            <th scope="col" className={cn(tableHead, "pr-5 text-right sm:pr-6")}>
              Deploys
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? `gone-${i}`} className={tableRow}>
              <td className="max-w-0 py-2.5 pl-5 pr-3 sm:pl-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  {kind === "members" ? <Avatar name={r.name} src={r.avatarUrl} size="sm" /> : null}
                  <div className="min-w-0 flex-1">
                    {kind === "projects" && r.id && !r.gone ? (
                      <Link href={`/projects/${r.id}`} className="block truncate font-medium hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      <span className={cn("block truncate font-medium", r.gone && "text-muted-foreground")}>{r.name}</span>
                    )}
                    <span aria-hidden="true" className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                      <span className="period-fill block h-full rounded-full bg-foreground/60" style={{ width: `${(r.ai / maxAi) * 100}%` }} />
                    </span>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px] tabular-nums">{nf(r.ai)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px] tabular-nums">{nf(r.minutes)}<span className="text-foreground-dim"> min</span></td>
              <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right font-mono text-[12.5px] tabular-nums sm:pr-6">{nf(r.deploys)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

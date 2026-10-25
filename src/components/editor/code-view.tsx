import { cn } from "@/lib/utils";

/**
 * Read-only code rendering for server components (share page). Line-numbered
 * <pre>, no syntax highlighting dependency so it is safe for untrusted content.
 */
export function CodeView({ content, className }: { content: string; className?: string }) {
  const lines = content.split("\n");
  return (
    <div className={cn("overflow-auto rounded-lg bg-code-bg text-[13px] leading-6 text-code-fg", className)}>
      <table className="min-w-full border-collapse font-mono">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td className="select-none border-r border-white/10 px-3 text-right align-top text-white/30">{i + 1}</td>
              <td className="whitespace-pre px-4">{line || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

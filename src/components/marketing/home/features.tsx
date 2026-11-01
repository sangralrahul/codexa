import Link from "next/link";
import { ArrowUpRight, Check, Cloud, Download, Flag, GitBranch, History, Rocket, RotateCcw, ShieldCheck, Sparkles, Terminal, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead } from "./frame";
import { Live } from "./live";

function CellHead({ n, icon: Icon, href, title, children }: { n: string; icon: LucideIcon; href: string; title: string; children: React.ReactNode }) {
  return (
    <div className="hm-cell__head">
      <span className="hm-cell__num">{n}</span>
      <h3 className="mkg-cell__h">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <Link href={href} className="mkg-cell__link">
          {title}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </h3>
      <p>{children}</p>
    </div>
  );
}

/**
 * 02 Features: a hairline bento of seven numbered cells, each with a small looping picture of the
 * real behaviour (tool calls, checkpoints, dev-server output, the pre-publish checks, roles,
 * GitHub and ZIP, containers). Pure CSS loops inside one <Live> region: they run only on screen
 * and stop on a still, complete frame under calm. The pictures are decorative (aria-hidden); the
 * cell text carries the meaning.
 */
export function HomeFeatures({
  files,
  checkTitles,
  publishChecks,
  roles,
  runtimes,
}: {
  files: { path: string; lines: number }[];
  checkTitles: string[];
  publishChecks: number;
  roles: string[];
  runtimes: string[];
}) {
  const log: { tool: string; arg: string; out: string }[] = [
    { tool: "list_files", arg: "", out: "project tree" },
    { tool: "read_file", arg: "src/App.tsx", out: "read" },
    { tool: "propose_plan", arg: "", out: "5 steps" },
    ...files.slice(0, 3).map((f) => ({ tool: "write_file", arg: f.path, out: `+${f.lines}` })),
    { tool: "edit_file", arg: "src/App.tsx", out: "edited" },
    { tool: "run_command", arg: "npm run typecheck", out: "passed" },
  ];
  const roleNotes: Record<string, string> = { owner: "Billing and the workspace", admin: "Members and settings", editor: "Build, edit and publish", viewer: "Read only" };
  const checks = checkTitles.slice(0, 6);
  return (
    <section aria-labelledby="features-title" className="mkg-row">
      <SectionHead id="features-title" index="02" label="Platform" title="Everything a build needs." dim="In one workspace.">
        <p>The agent, the editor, the sandbox and publishing share one project, one history and one set of files you own.</p>
      </SectionHead>
      <Live className="hm-bento">
        {/* 01 Agent */}
        <div className="hm-cell hm-cell--wide">
          <CellHead n="01" icon={Sparkles} href="/ai-agent" title="An agent that writes real files">
            It lists the project, writes a plan, edits TypeScript and React with tools you can watch, and runs a typecheck before it says done.
          </CellHead>
          <div className="hm-viz hm-log" aria-hidden="true">
            <p className="hm-viz__bar">
              <span>Agent run</span>
              <span className="hm-log__live">
                <i /> running
              </span>
            </p>
            <ol>
              {log.map((l, i) => (
                <li key={i} style={{ "--i": i } as React.CSSProperties}>
                  <Check className="size-3" strokeWidth={3} />
                  <code>{l.tool}</code>
                  <span>{l.arg}</span>
                  <em>{l.out}</em>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* 02 Checkpoints */}
        <div className="hm-cell">
          <CellHead n="02" icon={History} href="/code-editor" title="Checkpoints">
            Every AI run saves a checkpoint first. Open the diff or restore the whole project in one click.
          </CellHead>
          <div className="hm-viz hm-ckpt" aria-hidden="true">
            <ul>
              {[
                { icon: Sparkles, label: "Before AI run", kind: "AI run" },
                { icon: Rocket, label: "Published", kind: "Deploy" },
                { icon: Flag, label: "Cart works", kind: "Checkpoint" },
              ].map((c, i) => (
                <li key={c.label} style={{ "--i": i } as React.CSSProperties}>
                  <c.icon className="size-3.5 shrink-0" />
                  <span>{c.label}</span>
                  <span className="hm-ckpt__r">
                    <em>{c.kind}</em>
                    <b>
                      <RotateCcw className="size-3" /> Restore
                    </b>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 03 Console */}
        <div className="hm-cell">
          <CellHead n="03" icon={Terminal} href="/code-editor" title="Console and logs">
            The dev server&apos;s output streams into the workspace while the preview reloads beside your code.
          </CellHead>
          <div className="hm-viz hm-term" aria-hidden="true">
            <div className="hm-term__roll">
              {[0, 1].map((copy) => (
                <ol key={copy}>
                  <li>
                    <b>$</b> npm run dev
                  </li>
                  <li>VITE ready</li>
                  <li>
                    <i>➜</i> Local: preview running
                  </li>
                  <li>
                    <i>hmr</i> update /src/App.tsx
                  </li>
                  <li>
                    <i>hmr</i> update /src/Cart.tsx
                  </li>
                  <li>
                    <b>$</b> npm run typecheck
                  </li>
                  <li className="hm-term__ok">0 errors</li>
                  <li>
                    <i>hmr</i> update /src/products.ts
                  </li>
                </ol>
              ))}
            </div>
          </div>
        </div>

        {/* 04 Publish checks */}
        <div className="hm-cell">
          <CellHead n="04" icon={ShieldCheck} href="/app-deployment" title={`${publishChecks} pre-publish checks`}>
            Secrets in code, unsafe HTML, missing titles, broken links and heavy files are caught before anything goes live.
          </CellHead>
          <div className="hm-viz hm-checks" aria-hidden="true">
            <ul>
              {checks.map((c, i) => (
                <li key={c} style={{ "--i": i } as React.CSSProperties}>
                  <span className="hm-checks__dot">
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
            <p className="hm-checks__bar">
              <span />
            </p>
          </div>
        </div>

        {/* 05 Team */}
        <div className="hm-cell">
          <CellHead n="05" icon={Users} href="/teams" title="Team workspaces">
            Invite people with {roles.length} roles. Projects, usage and billing belong to the workspace.
          </CellHead>
          <div className="hm-viz hm-roles" aria-hidden="true">
            <ul>
              {roles.map((r, i) => (
                <li key={r} style={{ "--i": i } as React.CSSProperties}>
                  <span className="hm-roles__chip">{r}</span>
                  <span>{roleNotes[r] ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 06 Portable */}
        <div className="hm-cell">
          <CellHead n="06" icon={Download} href="/docs" title="Your code, portable">
            Import a repository from GitHub, push changes back, or download the whole project as a ZIP at any time.
          </CellHead>
          <div className="hm-viz hm-port" aria-hidden="true">
            <p className="hm-port__row">
              <GitBranch className="size-3.5" />
              <span>GitHub</span>
              <em className="hm-port__sync">
                <i />
                <i />
                <i />
              </em>
              <b>main</b>
            </p>
            <p className="hm-port__row">
              <Download className="size-3.5" />
              <span>candle-store.zip</span>
              <em className="hm-port__bar">
                <i />
              </em>
              <b>ZIP</b>
            </p>
          </div>
        </div>

        {/* 07 Containers */}
        <div className="hm-cell hm-cell--wide">
          <CellHead n="07" icon={Cloud} href="/security" title="One container per project, on Cloudflare">
            Generated code never runs on our web servers. Each project gets its own Container, started on demand by its own Durable Object, with {runtimes.join(", ")} ready.
          </CellHead>
          <div className="hm-viz hm-boxes" aria-hidden="true">
            {["candle-store", "crm-pipeline", "portfolio", "status-api"].map((p, i) => (
              <div key={p} className={cn("hm-box")} style={{ "--i": i } as React.CSSProperties}>
                <p>
                  <i /> {p}
                </p>
                <span>Container</span>
                <span className="hm-box__do">ProjectSandbox</span>
              </div>
            ))}
          </div>
        </div>
      </Live>
    </section>
  );
}

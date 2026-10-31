import Link from "next/link";
import { ArrowUpRight, Download, History, Monitor, Terminal, Users, type LucideIcon } from "lucide-react";
import { CAPTURES } from "@/components/marketing/captures";
import { SectionHead } from "./frame";
import type { HomeMeterRow } from "./data";

function CellTitle({ icon: Icon, href, children }: { icon: LucideIcon; href: string; children: React.ReactNode }) {
  return (
    <h3 className="mkg-cell__h">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <Link href={href} className="mkg-cell__link">
        {children}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </h3>
  );
}

/** 01 Platform: the agent cell with its capture and tool meter, then four numbered cells. */
export function HomePlatform({ meter, runtimes, roles }: { meter: HomeMeterRow[]; runtimes: string[]; roles: number }) {
  const agent = CAPTURES.agent;
  return (
    <section aria-labelledby="platform-title" className="mkg-row">
      <SectionHead id="platform-title" index="01" label="Platform" title="From one sentence" dim="to a running app.">
        <p>Every project gets its own container on Cloudflare. The code is yours: download it, import from GitHub, or keep editing by hand.</p>
      </SectionHead>
      <div className="mkg-cells">
        <div className="mkg-cell mkg-cell--big">
          <div>
            <CellTitle icon={Terminal} href="/ai-agent">
              Agent that writes real files
            </CellTitle>
            <p>Describe what you want. The agent inspects the project, writes a plan, edits TypeScript and React files, and runs a typecheck in the sandbox.</p>
            <ul className="mkg-meter" aria-label="Agent steps and the tools that run them">
              {meter.map((m) => (
                <li key={m.tool}>
                  {m.label}
                  <b>{m.tool}</b>
                </li>
              ))}
            </ul>
          </div>
          <div className="mkg-cell__img">
            {/* eslint-disable-next-line @next/next/no-img-element -- static capture with explicit size */}
            <img src={agent.src} alt={agent.alt} width={agent.width} height={agent.height} loading="lazy" decoding="async" />
          </div>
        </div>
        <div className="mkg-cell">
          <span className="mkg-num">02</span>
          <CellTitle icon={Monitor} href="/features">
            Isolated sandbox
          </CellTitle>
          <p>Generated code never runs on our web servers. It runs in a per-project container with a live preview.</p>
          <p className="mkg-bigstat">
            {runtimes.length}
            <small>runtimes</small>
          </p>
          <p className="mkg-mono-note">{runtimes.join(" / ")}</p>
        </div>
        <div className="mkg-cell">
          <span className="mkg-num">03</span>
          <CellTitle icon={History} href="/code-editor">
            Checkpoints
          </CellTitle>
          <p>Every AI run creates a checkpoint. View the diff or restore the whole project in one click.</p>
        </div>
        <div className="mkg-cell">
          <span className="mkg-num">04</span>
          <CellTitle icon={Users} href="/teams">
            Team workspaces
          </CellTitle>
          <p>Invite people with {roles} roles. Projects, usage and billing live with the workspace.</p>
        </div>
        <div className="mkg-cell">
          <span className="mkg-num">05</span>
          <CellTitle icon={Download} href="/docs">
            Your code, portable
          </CellTitle>
          <p>Import a repository from GitHub or download the whole project as files at any time.</p>
        </div>
      </div>
    </section>
  );
}

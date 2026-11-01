import Link from "next/link";
import { ReviewNote } from "@/components/marketing/review-note";
import { SectionHead } from "./frame";
import { Live } from "./live";

type Node = { id: string; x: number; y: number; w: number; title: string; sub: string; core?: boolean };

const H = 64;
const NODES: Node[] = [
  { id: "browser", x: 24, y: 170, w: 196, title: "Browser", sub: "httpOnly session cookie" },
  { id: "worker", x: 292, y: 170, w: 210, title: "Codexa Worker", sub: "app · API · auth · roles", core: true },
  { id: "sandbox", x: 574, y: 40, w: 200, title: "ProjectSandbox", sub: "Durable Object", core: true },
  { id: "container", x: 806, y: 40, w: 170, title: "Container", sub: "runner · your code", core: true },
  { id: "d1", x: 574, y: 170, w: 200, title: "Cloudflare D1", sub: "data · encrypted secrets" },
  { id: "r2", x: 574, y: 300, w: 200, title: "Cloudflare R2", sub: "files and large blobs" },
];

const PATHS = [
  "M220 202 H292",
  "M502 202 C540 202 536 72 574 72",
  "M774 72 H806",
  "M502 202 H574",
  "M502 202 C540 202 536 332 574 332",
];

/**
 * 04 Security & platform: the request path as implemented (Browser → Worker → a per-project
 * Durable Object and Container; D1 and R2 behind the Worker), drawn as inline SVG on the theme
 * tokens, with traffic flowing along the lines while it is on screen. Phones get the same path
 * as a list. The captions state architecture only; the review note stays until security signs off.
 */
export function HomePlatform() {
  return (
    <section aria-labelledby="platform-title" className="mkg-row">
      <SectionHead id="platform-title" index="04" label="Security & platform" title="Every project," dim="in its own box.">
        <p>
          Codexa runs on Cloudflare: the app is a Worker, and every project gets its own Container behind its own Durable Object.{" "}
          <Link href="/security" className="mkg-inline-link">
            Read the security overview
          </Link>
        </p>
      </SectionHead>
      <Live as="figure" className="hm-diagram">
        <svg viewBox="0 0 1000 400" role="img" aria-labelledby="platform-svg-title" className="hm-diagram__svg">
          <title id="platform-svg-title">Request path: the browser talks to the Codexa Worker, which reaches a per-project ProjectSandbox Durable Object and its Container, and stores data in D1 and files in R2.</title>
          <g fill="none" strokeWidth="1.25">
            {PATHS.map((d) => (
              <path key={d} d={d} stroke="var(--border-strong)" />
            ))}
            {PATHS.map((d, i) => (
              <path key={`f${d}`} d={d} className="hm-flow" stroke="var(--foreground)" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </g>
          <rect x="560" y="22" width="430" height="100" rx="14" fill="none" stroke="var(--border-strong)" strokeDasharray="3 5" />
          <text x="574" y="150" fontFamily="var(--font-mono)" fontSize="11" fill="var(--muted-foreground)" style={{ letterSpacing: "0.06em" }}>
            ONE PER PROJECT · STARTED ON DEMAND
          </text>
          <text x="806" y="207" fontFamily="var(--font-mono)" fontSize="11" fill="var(--muted-foreground)">
            encryptSecret() first
          </text>
          <text x="806" y="337" fontFamily="var(--font-mono)" fontSize="11" fill="var(--muted-foreground)">
            large blobs, off D1
          </text>
          {NODES.map((n) => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={H} rx="12" fill="var(--card)" stroke={n.core ? "var(--foreground)" : "var(--border-strong)"} strokeOpacity={n.core ? 0.55 : 1} />
              <text x={n.x + 16} y={n.y + 28} fontSize="14" fontWeight="600" fill="var(--foreground)" fontFamily="var(--font-sans)">
                {n.title}
              </text>
              <text x={n.x + 16} y={n.y + 47} fontSize="11.5" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
                {n.sub}
              </text>
            </g>
          ))}
        </svg>
        <ol className="hm-diagram__list" aria-label="Request path through Codexa">
          {NODES.map((n, i) => (
            <li key={n.id}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{n.title}</b>
              <em>{n.sub}</em>
            </li>
          ))}
        </ol>
      </Live>
      <ul className="hm-facts3">
        <li>
          <b>Isolated per project</b>
          Generated code runs only in that project&apos;s Container, never inside the web app&apos;s process.
        </li>
        <li>
          <b>Previews on their own origin</b>
          The live preview is served from a separate host, away from your Codexa session.
        </li>
        <li>
          <b>Secrets stay server-side</b>
          Keys you add are encrypted before they are stored and never sent back to the browser. Session tokens are hashed.
        </li>
      </ul>
      <div className="hm-review">
        <ReviewNote kind="security">This is a summary of the architecture as implemented. The security team reviews it before it is treated as a commitment; the Security page has the detail.</ReviewNote>
      </div>
    </section>
  );
}

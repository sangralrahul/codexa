import * as React from "react";
import { cn } from "@/lib/utils";
import type { IllustrationId } from "@/content/marketing/types";
import { BrowserWindow } from "./premium";

/**
 * Real captures of the Codexa app (public/marketing), taken with Playwright at 1440×900 from a
 * signed-in workspace on a development server and cropped; nothing is drawn or invented. The
 * development-only "Mock AI" badge (shown when AI_MOCK=1) is not in any capture, since it never
 * appears in production. Each entry says what the picture shows; captions quote it.
 */
export type Capture = { src: string; width: number; height: number; alt: string; caption: string; url: string };

export const CAPTURES = {
  dashboard: { src: "/marketing/app-dashboard.webp", width: 1280, height: 800, alt: "The Codexa dashboard: a workspace composer, usage meters and recent projects with a live deployment.", caption: "The dashboard, captured from the app.", url: "codexa · Dashboard" },
  composer: { src: "/marketing/app-composer.webp", width: 896, height: 560, alt: "The New project composer with a prompt typed in, a React starter chosen and a Build button.", caption: "The New project composer, captured from the app.", url: "codexa · New project" },
  editor: { src: "/marketing/app-editor.webp", width: 1048, height: 655, alt: "The workspace code view: file explorer, Cart.tsx open in the Monaco editor, terminal and problems tabs.", caption: "The code editor, captured from the workspace.", url: "codexa · Candle store · Code" },
  agent: { src: "/marketing/app-agent.webp", width: 720, height: 450, alt: "The agent panel mid-run: the plan, two files being written and the action list, beside the explorer with modified files marked.", caption: "An agent run in progress, captured from the workspace.", url: "codexa · Candle store · Agent" },
  history: { src: "/marketing/app-history.webp", width: 680, height: 425, alt: "The Version history drawer: the working copy, two checkpoints taken before AI runs and the initial checkpoint, each with View diff and Restore.", caption: "Version history, captured from the workspace.", url: "codexa · Candle store · History" },
  publish: { src: "/marketing/app-publish.webp", width: 880, height: 550, alt: "The Publish dialog: the live address with a Live badge, the Codexa hosting target and the pre-publish checks.", caption: "The Publish dialog, captured from the workspace.", url: "codexa · Candle store · Publish" },
  settings: { src: "/marketing/app-settings.webp", width: 1280, height: 800, alt: "Workspace settings: profile, security, billing, usage and members at a glance.", caption: "Settings, captured from the app.", url: "codexa · Settings" },
  demoDescribe: { src: "/marketing/demo-describe.webp", width: 1280, height: 732, alt: "The New project page with a prompt typed into the composer.", caption: "The New project page, captured from the app.", url: "codexa · New project" },
  demoAgent: { src: "/marketing/demo-agent.webp", width: 1280, height: 732, alt: "The workspace while the agent builds: the plan and written files in the agent panel, the editor beside it.", caption: "An agent run, captured from the workspace.", url: "codexa · Candle store" },
  demoHistory: { src: "/marketing/demo-history.webp", width: 1280, height: 732, alt: "The Version history drawer open over the workspace.", caption: "Version history, captured from the workspace.", url: "codexa · Candle store · History" },
  demoPublish: { src: "/marketing/demo-publish.webp", width: 1280, height: 732, alt: "The Publish dialog open over the workspace, with the live address and pre-publish checks.", caption: "The Publish dialog, captured from the workspace.", url: "codexa · Candle store · Publish" },
} as const satisfies Record<string, Capture>;

export type CaptureId = keyof typeof CAPTURES;

/** Which capture stands in for a drawn illustration id, where a real one exists. */
export const CAPTURE_FOR_ILLUSTRATION: Partial<Record<IllustrationId, CaptureId>> = {
  "agent-run": "agent",
  "agent-run-site": "agent",
  "agent-run-ui": "agent",
  "agent-modes": "agent",
  "plan-steps": "agent",
  "repair-loop": "agent",
  "editor-peek": "editor",
  "editor-api": "editor",
  "diff-restore": "history",
  "commit-list": "history",
  "deploy-history": "publish",
  "build-log": "publish",
};

/** The plain picture (lazy, sized), for tiles and rows. */
export function CaptureImage({ id, className, priority, sizes }: { id: CaptureId; className?: string; priority?: boolean; sizes?: string }) {
  const c = CAPTURES[id];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={c.src}
      alt={c.alt}
      width={c.width}
      height={c.height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("block w-full bg-card object-cover object-top", className)}
    />
  );
}

/** A capture in the browser frame with the faint wash, plus a visible caption saying what it is. */
export function CaptureWindow({ id, className, caption = true, priority }: { id: CaptureId; className?: string; caption?: boolean; priority?: boolean }) {
  const c = CAPTURES[id];
  return (
    <figure className={cn("min-w-0", className)}>
      <BrowserWindow url={c.url}>
        <CaptureImage id={id} priority={priority} />
      </BrowserWindow>
      <figcaption className={cn("mt-3 text-[12.5px] text-muted-foreground", !caption && "sr-only")}>{c.caption}</figcaption>
    </figure>
  );
}

/** A capture as a small 16:10 tile (card corner radius, hairline), for feature cards. */
export function CaptureTile({ id, className }: { id: CaptureId; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[10px] border border-border bg-card", className)}>
      <CaptureImage id={id} className="aspect-[16/10]" />
    </div>
  );
}

import { Bot, Bug, Cloud, Code2, Database, Eye, FileDiff, FolderTree, GitBranch, Globe, History, Keyboard, KeyRound, Layers, LayoutTemplate, ListChecks, Lock, MonitorSmartphone, Play, Rocket, RotateCcw, Search, Server, Share2, ShieldCheck, Sparkles, Terminal, Users, Wallet, Wrench } from "lucide-react";
import type { ComparisonGroup } from "@/components/marketing/comparison-table";
import type { ContentSection, FAQItem, Feature } from "./types";

export type FeatureGroup = { id: string; title: string; description: string; features: Feature[]; note?: string };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "ai",
    title: "AI generation and the agent",
    description: "A provider abstraction for Anthropic and OpenAI models drives a tool-using agent that works on real files.",
    features: [
      { title: "Prompt to project", description: "Start from a sentence. The planner picks a starter template and writes a plan before editing.", icon: Sparkles, href: "/ai-app-builder" },
      { title: "Build, Ask, and Fix modes", description: "Build makes changes, Ask answers questions about the code without editing, Fix targets a specific error.", icon: Bot, href: "/ai-agent" },
      { title: "File tools", description: "The agent reads, writes, renames, and deletes files through tools; every call is shown in the run log.", icon: FolderTree },
      { title: "Validation and bounded repair", description: "Type-check, build, and tests run in the sandbox. Errors are read back and repaired at most twice.", icon: ListChecks },
      { title: "Streaming progress", description: "Stages, text, tool calls, file changes, and usage stream to the browser; runs can be cancelled.", icon: Play },
      { title: "Snapshot before every run", description: "Per-file diffs after the run and one-click revert if the result is wrong.", icon: RotateCcw },
    ],
    note: "AI features require an Anthropic or OpenAI API key configured by the operator of your Codexa instance. Without one the agent shows an explicit \"not configured\" state.",
  },
  {
    id: "editor",
    title: "Editor",
    description: "Monaco-based, served from the Codexa origin, with the tooling you expect from a desktop editor.",
    features: [
      { title: "Tabs and file explorer", description: "Open several files, create folders, rename and delete with confirmation.", icon: Code2, href: "/code-editor" },
      { title: "Search and replace", description: "Project-wide search with replace across files.", icon: Search },
      { title: "Diagnostics", description: "TypeScript and build errors surface inline and in a problems panel.", icon: Bug },
      { title: "Diff view", description: "Compare the working copy with any snapshot, file by file.", icon: FileDiff },
      { title: "Autosave and shortcuts", description: "Changes persist automatically; common actions have keyboard shortcuts.", icon: Keyboard },
    ],
  },
  {
    id: "runtime",
    title: "Runtime and preview",
    description: "Projects run in a separate runner service, never inside the web application.",
    features: [
      { title: "Isolated sandboxes", description: "Unprivileged user, Linux namespaces, cgroup memory and process limits, and timeouts. Docker and E2B drivers are available.", icon: ShieldCheck, href: "/security" },
      { title: "Live preview", description: "A host-based proxy serves the running app at a preview hostname.", icon: Eye, href: "/visual-editor" },
      { title: "Streamed logs", description: "stdout, stderr, and system lines stream to the workspace as they happen.", icon: Terminal },
      { title: "Responsive viewports", description: "Switch between desktop, tablet, and phone widths while previewing.", icon: MonitorSmartphone },
      { title: "Allowlisted commands", description: "Install, build, test, and type-check run as named commands, not arbitrary shell.", icon: Wrench },
    ],
  },
  {
    id: "data",
    title: "Backend, databases, and secrets",
    description: "Full-stack projects need data and configuration; both are handled in the workspace.",
    features: [
      { title: "PostgreSQL and Supabase", description: "Workspace connections with a schema browser and a SQL runner that asks before destructive statements.", icon: Database, href: "/full-stack-development" },
      { title: "Node + Express APIs", description: "A starter template for REST APIs with TypeScript.", icon: Server },
      { title: "Encrypted environment variables", description: "Encrypted at rest, masked in the UI, injected into previews and deployments.", icon: KeyRound },
    ],
  },
  {
    id: "history",
    title: "Version history and sharing",
    description: "Every project keeps its own history inside Codexa, independent of Git.",
    features: [
      { title: "Named snapshots", description: "Create checkpoints by hand or automatically before AI runs.", icon: History },
      { title: "Restore", description: "Roll a project back to any snapshot in one click.", icon: RotateCcw },
      { title: "Activity history", description: "Who did what and when, per project.", icon: Layers },
      { title: "Share links", description: "Expiring links for viewing or editing a project.", icon: Share2 },
      { title: "GitHub import, commit, and push", description: "Available when GitHub OAuth is configured by the operator.", icon: GitBranch, href: "/integrations" },
    ],
  },
  {
    id: "deploy",
    title: "Deployment",
    description: "Codexa static hosting works out of the box; other targets are adapters.",
    features: [
      { title: "Codexa static hosting", description: "Build in the sandbox and serve at a subdomain, with history and rollback.", icon: Rocket, href: "/app-deployment" },
      { title: "Vercel adapter", description: "Deploy to Vercel when a token is configured in workspace integrations.", icon: Cloud },
      { title: "Custom domains", description: "CNAME instructions are provided; automatic verification is planned.", icon: Globe },
    ],
  },
  {
    id: "teams",
    title: "Teams, billing, and administration",
    description: "Workspaces, roles, plans, and a staff-only admin area.",
    features: [
      { title: "Team workspaces", description: "Owner, admin, editor, and viewer roles with email invitations.", icon: Users, href: "/teams" },
      { title: "Realtime presence", description: "See who is viewing which file over WebSockets. Concurrent editing is on the roadmap.", icon: Eye },
      { title: "Plans in INR and USD", description: "Free, Pro, Team, and Enterprise; Razorpay for India and Stripe internationally.", icon: Wallet, href: "/pricing" },
      { title: "Server-side limits", description: "AI requests and tokens, runtime minutes, deployments, storage, projects, and members.", icon: Lock, href: "/usage" },
      { title: "Starter templates", description: "React + Vite SPA, static site, and Node + Express API.", icon: LayoutTemplate, href: "/templates" },
    ],
    note: "Roadmap, not shipped: concurrent editing (CRDT), SDK and CLI, native mobile apps, SSO/SAML, and third-party security certifications.",
  },
];

export const HOW_IT_WORKS_DETAIL: ContentSection[] = [
  {
    id: "plan",
    heading: "1. Plan",
    blocks: [
      { type: "paragraph", text: "The agent receives your prompt together with a listing of the project files and the contents of the files it decides to read. It writes a short plan: which files it will create or change and why. In Ask mode it stops here and answers without editing." },
      { type: "paragraph", text: "Before any edit, Codexa creates a snapshot of the project. That snapshot is what the per-file diff and the revert action compare against." },
    ],
  },
  {
    id: "generate",
    heading: "2. Generate",
    blocks: [
      { type: "paragraph", text: "Edits happen through tools (read, write, rename, delete) against your real project files in PostgreSQL. Each tool call and each file change is streamed to the browser as it happens, so you can follow along or cancel." },
      { type: "list", items: ["Starter templates: React + Vite + TypeScript + Tailwind, static HTML/CSS/JS, Node + Express.", "Imported GitHub repositories are edited in place.", "Usage (requests and tokens) is recorded per run and counted against your plan; see [credits](/credits)."] },
    ],
  },
  {
    id: "validate",
    heading: "3. Validate",
    blocks: [
      { type: "paragraph", text: "The changed project is synced into an isolated sandbox where type-check, build, and tests run as allowlisted commands. Output is read back by the agent. If there are errors it attempts a repair, at most twice, and then hands control back to you with the errors visible." },
    ],
  },
  {
    id: "run",
    heading: "4. Run",
    blocks: [
      { type: "paragraph", text: "Start a preview in the same sandbox. The runner service executes your project as an unprivileged user inside Linux namespaces with memory and process limits; a host-based proxy serves it at a preview hostname. Logs stream to the workspace and you can switch viewports to check responsive layouts." },
    ],
  },
  {
    id: "ship",
    heading: "5. Ship",
    blocks: [
      { type: "paragraph", text: "Deploy to Codexa static hosting: the build runs in the sandbox, the output is served at a subdomain, and every deployment stays in history so you can roll back. The Vercel adapter is available when a token is configured. Custom domains get CNAME instructions today; verification is planned." },
      { type: "links", items: [{ label: "App deployment", href: "/app-deployment", description: "Hosting, history, rollback, and domains." }, { label: "Deployment docs", href: "/docs/deployment", description: "Step-by-step instructions." }] },
    ],
  },
];

export const HOW_IT_WORKS_FAQ: FAQItem[] = [
  { question: "Can I stop a run half way?", answer: "Yes. Runs stream their progress and can be cancelled. Whatever was changed up to that point is visible in the diff and can be reverted." },
  { question: "What if validation keeps failing?", answer: "After two repair attempts the agent stops and shows the errors. You can fix them in the editor, ask the agent in Fix mode with a specific error, or revert the run." },
  { question: "Does the agent run my code on its own?", answer: "Only allowlisted commands (install, build, test, type-check) in the sandbox. Starting the preview is a separate action you trigger." },
  { question: "Where is my code stored?", answer: "Project files are stored in PostgreSQL. Snapshots are stored alongside them. You can export to GitHub whenever GitHub OAuth is configured." },
];

export const ALTERNATIVES_INTRO = "There are three common ways to get AI help building software: hosted AI builders that generate an app from a prompt, assistants inside your own IDE, and no-code tools with drag-and-drop editors. Codexa combines generation with a real editor and runtime, and accepts the trade-offs that come with that choice.";

export const ALTERNATIVES_TABLE: { columns: string[]; groups: ComparisonGroup[] } = {
  columns: ["Codexa", "Hosted AI builders", "IDE assistants", "No-code tools"],
  groups: [
    {
      heading: "Code and ownership",
      rows: [
        { label: "Generated output", values: ["Ordinary source files", "Varies: files or a hosted project", "Edits in your repository", "Proprietary configuration"] },
        { label: "Export the code", values: [true, "Often", true, "Usually limited"] },
        { label: "Edit by hand in a full editor", values: ["Monaco in the browser", "Varies", "Your own IDE", false] },
        { label: "Push to GitHub", values: ["When OAuth is configured", "Varies", true, "Rarely"] },
      ],
    },
    {
      heading: "Running and validating",
      rows: [
        { label: "Isolated runtime for previews", values: ["Namespaced sandbox via runner service", "Usually hosted", "Your machine", "Hosted"] },
        { label: "Automated type-check, build, and tests", values: ["Before you see the result, bounded repair", "Varies", "Only if you run them", null] },
        { label: "Snapshot and revert every AI run", values: [true, "Varies", "Via Git", "Varies"] },
      ],
    },
    {
      heading: "Scope",
      rows: [
        { label: "Backend and database", values: ["Express APIs, PostgreSQL and Supabase", "Varies", "Anything you install", "Built-in data tables"] },
        { label: "Deployment", values: ["Codexa hosting; Vercel adapter", "Hosted", "Your pipeline", "Hosted"] },
        { label: "Design freedom", values: ["Code-level", "Code-level", "Code-level", "Within the tool's components"] },
        { label: "Learning curve", values: ["Medium", "Low", "Needs development experience", "Low"] },
      ],
    },
    {
      heading: "Not in Codexa yet",
      rows: [
        { label: "Concurrent editing", values: ["Roadmap", "Varies", "Via Git", "Often"] },
        { label: "Drag-and-drop visual builder", values: [false, "Sometimes", false, true] },
        { label: "Native mobile apps", values: [false, "Varies", "Depends on your stack", "Sometimes"] },
      ],
    },
  ],
};

export const ALTERNATIVES_TRADEOFFS: ContentSection[] = [
  {
    id: "vs-hosted",
    heading: "Compared with hosted AI builders",
    blocks: [
      { type: "paragraph", text: "Hosted builders optimise for the first ten minutes: type a prompt, see an app. Codexa does that too, but it insists on a real project with files you can read, a type-check and build before the result is shown, and a snapshot you can revert to. The cost is a slightly heavier interface and the need for an AI provider key configured by your operator." },
    ],
  },
  {
    id: "vs-ide",
    heading: "Compared with IDE assistants",
    blocks: [
      { type: "paragraph", text: "IDE assistants live where experienced developers already work and have access to everything installed on your machine. Codexa runs in the browser with an isolated runtime, which makes it safer for untrusted generated code and easier to share, but it supports fewer stacks today (React + Vite, static sites, Node + Express) and does not replace a local toolchain. The two combine well: push to GitHub and keep working in your IDE." },
    ],
  },
  {
    id: "vs-nocode",
    heading: "Compared with no-code tools",
    blocks: [
      { type: "paragraph", text: "No-code tools are faster for people who never want to see code and are happy inside the tool's component set and hosting. Codexa expects you (or the agent) to work with source code. In exchange there is no ceiling: anything expressible in TypeScript is possible, and the project can leave the platform at any time. Codexa does not have a drag-and-drop canvas." },
    ],
  },
  {
    id: "honest-limits",
    heading: "Where Codexa is weaker today",
    blocks: [
      { type: "list", items: ["Concurrent editing by several people on one file is on the [roadmap](/roadmap); presence is shipped, CRDT is not.", "No SDK or CLI yet; the HTTP API is documented at [/api](/api).", "No third-party security certifications; see [security](/security) for what is implemented.", "AI features depend on an operator-configured Anthropic or OpenAI key."] },
    ],
  },
];

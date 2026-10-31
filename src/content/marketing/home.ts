/**
 * Copy and small data maps for the marketing home page (src/app/(marketing)/page.tsx).
 *
 * Honesty rules (CLAUDE.md, PLAN §1): no numbers live here. Every count on the home page is
 * imported from code or config at render time (TEMPLATES, toolSchemas, LIMITS, workspaceRoleEnum,
 * PLANS, the providers registry, the changelog). Template ids below are checked against the real
 * starters: scenarios.ts stages only ids that exist in TEMPLATES, and on the home page the prompt
 * box drops a chip whose id is not in the starter list.
 */

export const HOME_HERO = {
  /** Eyebrow pill when there is no changelog entry to announce. */
  eyebrow: "AI-native development platform",
  /** The H1 (plain white, one line where it fits). `lines`/`phrase` are kept for existing callers. */
  title: "What do you want to build?",
  lines: ["What do you want to build?"],
  phrase: "",
  lead: "Describe it. Codexa plans the files, writes real TypeScript, runs the build in a sandbox and deploys it.",
  primary: { label: "Get started", href: "/signup", signedInLabel: "Open dashboard", signedInHref: "/dashboard" },
  secondary: { label: "Browse templates", href: "/templates" },
  templatesLink: { label: "Start from a template", href: "/templates" },
  importLink: { label: "Import from GitHub", href: "/import-project" },
  storyLink: { label: "How it works", href: "#how-it-works" },
  /** Under the demo: what the pictures are. */
  demoCaption: "Captured from the Codexa workspace on a development server: a real project, the real agent panel, version history and the Publish dialog.",
} as const;

/** "Built on" trust row: the stack Codexa and its starters actually run on (not customers). */
export const HOME_TRUST = {
  label: "Built on",
  items: [
    { id: "react", name: "React" },
    { id: "vite", name: "Vite" },
    { id: "typescript", name: "TypeScript" },
    { id: "node", name: "Node.js" },
    { id: "cloudflare", name: "Cloudflare" },
  ],
  note: "Trademarks belong to their owners.",
} as const;

/**
 * The three-step "how it works" on the home: each step has a real product picture (see
 * home/how-it-works.tsx for what each picture is and where it comes from).
 */
export const HOME_STEPS = [
  { id: "describe", icon: "sparkles", label: "Describe", title: "Say what you want in a sentence.", body: "Type the app you have in mind, or start from a real starter template. The agent reads the project and writes a short plan before it touches a file." },
  { id: "preview", icon: "monitor", label: "Build and preview", title: "Watch it build, then click through it.", body: "The agent edits real files with tools you can see. Type-check and build run in an isolated sandbox, and the live preview opens at desktop, tablet and phone sizes." },
  { id: "ship", icon: "rocket", label: "Ship", title: "Publish with one click.", body: "Deploy to Codexa hosting with a shareable URL. Every version is kept, so you can roll back the moment something looks wrong." },
] as const;

/** The eight features on the home grid, by title in PLATFORM_FEATURES (src/content/marketing/product.ts). */
export const HOME_FEATURE_TITLES = ["AI app builder", "AI agent", "Code editor", "Snapshots and diffs", "Deployment", "Isolated runtimes", "Databases", "Teams"] as const;

export const HOME_FEATURES_COPY = {
  index: "Platform",
  title: "Everything a real project needs, in one workspace.",
  phrase: "",
  lead: "Real files in a real editor, an agent that shows every tool call, a sandbox that runs the build before you see the result, and hosting with history.",
  all: { label: "All features", href: "/features" },
};

export const HOME_HOW = {
  index: "How it works",
  title: "From a sentence to a deployed app.",
  lead: "Each run is planned, written with tools, validated in a sandbox and kept in history. Nothing is hidden behind a spinner.",
  more: { label: "Read how it works", href: "/how-it-works" },
};

/** Example ideas under the hero prompt. Each chip types its prompt and switches the stage to its starter. */
export const HOME_CHIPS: { label: string; templateId: string; prompt: string }[] = [
  { label: "Analytics dashboard", templateId: "vite-react-dashboard", prompt: "An analytics dashboard for a subscription business with revenue cards and a searchable customers table" },
  { label: "Online store", templateId: "vite-react-storefront", prompt: "An online store for handmade candles with categories, search and a cart" },
  { label: "CRM pipeline", templateId: "vite-react-crm", prompt: "A CRM for a two-person sales team with a deal pipeline and a contacts table" },
  { label: "Landing page", templateId: "vite-react-landing", prompt: "A landing page for a coffee subscription with features, pricing and a waitlist form" },
  { label: "AI chat app", templateId: "vite-react-ai-chat", prompt: "An AI chat assistant that answers questions about our product docs" },
  { label: "Portfolio", templateId: "vite-react-portfolio", prompt: "A developer portfolio with a filterable project grid and a contact form" },
];

/** The stage opens on this starter (it has the richest file set of the chip starters). */
export const DEFAULT_SCENARIO_ID = "vite-react-crm";

/**
 * Live match synonyms (PLAN §5.2): a word in the visitor's sentence → the starter it points to.
 * Matching is client-side keyword scoring, labelled "Closest starter" (never "AI picked").
 */
export const STARTER_SYNONYMS: Record<string, string> = {
  shop: "vite-react-storefront",
  store: "vite-react-storefront",
  storefront: "vite-react-storefront",
  cart: "vite-react-storefront",
  ecommerce: "vite-react-storefront",
  sell: "vite-react-storefront",
  crm: "vite-react-crm",
  leads: "vite-react-crm",
  lead: "vite-react-crm",
  pipeline: "vite-react-crm",
  deals: "vite-react-crm",
  sales: "vite-react-crm",
  dashboard: "vite-react-dashboard",
  analytics: "vite-react-dashboard",
  kpi: "vite-react-dashboard",
  metrics: "vite-react-dashboard",
  revenue: "vite-react-dashboard",
  chat: "vite-react-ai-chat",
  chatbot: "vite-react-ai-chat",
  assistant: "vite-react-ai-chat",
  blog: "static-blog",
  posts: "static-blog",
  portfolio: "vite-react-portfolio",
  resume: "vite-react-portfolio",
  cv: "vite-react-portfolio",
  admin: "vite-react-admin",
  users: "vite-react-admin",
  members: "vite-react-admin",
  crud: "vite-react-admin",
  todo: "vite-react-tasks",
  todos: "vite-react-tasks",
  tasks: "vite-react-tasks",
  kanban: "vite-react-tasks",
  notes: "vite-react-tasks",
  landing: "vite-react-landing",
  waitlist: "vite-react-landing",
  launch: "vite-react-landing",
  api: "node-express-api",
  backend: "node-express-api",
  endpoint: "node-express-api",
  endpoints: "node-express-api",
  rest: "node-express-api",
  status: "vite-react-ops-dashboard",
  incidents: "vite-react-ops-dashboard",
  monitoring: "vite-react-ops-dashboard",
  uptime: "vite-react-ops-dashboard",
  mobile: "vite-react-mobile-shell",
  phone: "vite-react-mobile-shell",
  pwa: "vite-react-mobile-shell",
  saas: "vite-react-saas",
  subscription: "vite-react-saas",
};

export type ChapterId = "describe" | "plan" | "generate" | "validate" | "preview" | "ship";

/** Storyboard chapters (PLAN §5.2 table). `durationMs` is the scripted segment length. */
export const HOME_CHAPTERS: { id: ChapterId; label: string; durationMs: number; caption: (ctx: { repairWord: string }) => string }[] = [
  { id: "describe", label: "Describe", durationMs: 2400, caption: () => "Say what you want in plain words. Pick a starter, or let Codexa start from the closest one." },
  { id: "plan", label: "Plan", durationMs: 2000, caption: () => "The agent reads your project and writes a short plan of the files it will change. A snapshot is taken first." },
  { id: "generate", label: "Generate", durationMs: 3400, caption: () => "It edits real files with tools. Every write is listed, and you can change any line by hand." },
  {
    id: "validate",
    label: "Validate",
    durationMs: 2400,
    caption: ({ repairWord }) => `Type-check and build run in an isolated sandbox. Errors are read back and repaired, at most ${repairWord}.`,
  },
  { id: "preview", label: "Preview", durationMs: 2200, caption: () => "Your app runs in its own container, with a live preview at desktop, tablet and phone sizes." },
  { id: "ship", label: "Ship", durationMs: 1800, caption: () => "Publish to Codexa hosting, keep every version and roll back in one click." },
];

/** "once", "twice", "3 times" — for copy that quotes a limit read from code. */
export function timesWord(n: number): string {
  if (n === 1) return "once";
  if (n === 2) return "twice";
  return `${n} times`;
}

export const HOME_STAGE_COPY = {
  badge: "Scripted replay · not a recording",
  detail: (starter: string) =>
    `A scripted replay built from the real ${starter} starter files and screenshot. No AI model is called here. In your project the plan, code and timing will differ, and AI generation needs an operator-configured key.`,
  caption: (starter: string) => `Illustration: a scripted replay built from the real ${starter} files and screenshot. Not a recording; no AI model is called.`,
  sampleDomain: "example.com",
  illustrativeError: "illustrative error",
};

export const HOME_PROOF = {
  index: "Built in the open",
  title: "Numbers read from the source, not from a slide.",
  note: "Each count is read from Codexa's own code at render time. We do not publish usage or customer numbers.",
  platformLine: "Runs on Cloudflare Workers and Containers.",
};

export const HOME_WALL = {
  index: "Starters",
  title: "Start from a real app, not a blank page.",
  caption: "Screenshots captured from each starter template's own build.",
  browse: { label: "Browse all starters", href: "/templates" },
};

export const HOME_PRINCIPLES = {
  index: "03 — Principles",
  title: "An AI builder that behaves like a development platform.",
  highlight: "development platform.",
  cards: {
    code: {
      title: "Real code",
      body: "Ordinary files in a real editor. Generate with AI, edit any line by hand, and push to GitHub whenever you like.",
      note: "GitHub sync needs OAuth configured by the operator.",
    },
    validated: {
      title: "Validated",
      body: (repairWord: string) => `Type-check and build run in an isolated sandbox before you see the result. The agent reads the errors and repairs them, at most ${repairWord}.`,
    },
    reversible: {
      title: "Reversible",
      body: "A snapshot is taken before every AI run. Compare the result, then keep it or restore in one click.",
    },
  },
};

export const HOME_PLATFORM = {
  index: "04 — Platform",
  title: "Everything a real project needs.",
  highlight: "a real project needs.",
  caption: "Interface examples with sample data.",
  chips: [
    { label: "Code editor", href: "/code-editor", icon: "code" },
    { label: "Live preview", href: "/how-it-works", icon: "eye" },
    { label: "Deployments", href: "/app-deployment", icon: "rocket" },
    { label: "GitHub", href: "/docs/github", icon: "git" },
    { label: "Environment variables", href: "/docs/environment-variables", icon: "key" },
    { label: "Teams", href: "/teams", icon: "users" },
    { label: "INR & USD billing", href: "/pricing", icon: "rupee" },
  ] as const,
};

export const HOME_INTEGRATIONS = {
  index: "Connect",
  title: "Connect the services you already use.",
  lead: "Bring your own keys for AI providers, payments, email, databases and hosting. Secrets are encrypted before they are stored and never sent back to the browser.",
  trademark: "Trademarks belong to their owners; no partnership implied.",
  all: { label: "All integrations", href: "/integrations" },
};

export const HOME_PRICING = {
  index: "Pricing",
  title: "Free to start. Priced in INR and USD.",
  lead: "Limits are enforced on the server for AI requests and tokens, runtime minutes, deployments, storage, projects and members.",
  chips: [
    { label: "INR & USD", icon: "rupee" },
    { label: "UPI via Razorpay", icon: "phone" },
    { label: "Stripe internationally", icon: "card" },
  ] as const,
  full: { label: "Full pricing, including Enterprise", href: "/pricing" },
};

export const HOME_FAQ = {
  index: "Questions",
  title: "Questions, answered.",
  support: { label: "Still stuck? Contact support", href: "/support" },
};

export const HOME_FINAL = {
  title: "Start with a sentence.",
  phrase: "",
  lead: "Describe the app you want. Codexa plans it, writes the files, runs the build and gives you a preview to work from.",
  pricing: { label: "See pricing", href: "/pricing" },
};

/* ------------------------------------------------------------------------------------------------
   v5 home: stats strip, bento grid, timeline, platform (Cloudflare) section, gallery. Copy only;
   every number is read from code in home/data.ts (FACTS) at render time.
   ------------------------------------------------------------------------------------------------ */

export const HOME_STATS = {
  index: "By the numbers",
  title: "Counted from the source at render time.",
  note: "Each figure is read from Codexa's own registries when this page renders: the template registry, the agent's tool schemas and the pre-publish scanner. No usage or customer numbers are published.",
};

/** The six bento cells. `visual` names a capture or a live fragment (home/fragments.tsx). */
export const HOME_BENTO = {
  index: "Platform",
  title: "Everything a real project needs, in one workspace.",
  lead: "Real files in a real editor, an agent that shows every tool call, a sandbox that runs the build before you see the result, and hosting with history.",
  all: { label: "All features", href: "/features" },
  cells: [
    { id: "agent", size: "wide", visual: "capture:agent", title: "An agent that shows its work", body: "It reads the project, proposes a plan, then writes real files with tools you can see. Every action is listed as it happens.", href: "/ai-agent" },
    { id: "checks", size: "tall", visual: "fragment:checks", title: "Checks before every publish", body: "Secrets, unsafe code, SEO basics, alt text, dead links and heavy files are scanned before anything goes live.", href: "/app-deployment" },
    { id: "history", size: "base", visual: "fragment:checkpoints", title: "A checkpoint before every run", body: "Diff any file against any checkpoint and restore in one click. Nothing the agent does is irreversible.", href: "/features#history" },
    { id: "editor", size: "base", visual: "capture:editor", title: "A real editor, not a text box", body: "Monaco, a file explorer, a terminal and a problems tab. Edit any line by hand, whenever you like.", href: "/code-editor" },
    { id: "sandbox", size: "base", visual: "fragment:rail", title: "Builds run in a sandbox", body: "Install, type-check and build run in an isolated container per project, never in the app itself.", href: "/security" },
    { id: "publish", size: "base", visual: "fragment:live", title: "One click to a live address", body: "Publish to Codexa hosting with a shareable URL. Every version is kept; roll back the moment something looks wrong.", href: "/app-deployment" },
  ],
} as const;

/** The four timeline steps (captures from the animated demo, in order). */
export const HOME_TIMELINE = {
  index: "How it works",
  title: "From a sentence to a deployed app.",
  lead: "Each run is planned, written with tools, validated in a sandbox and kept in history. Nothing is hidden behind a spinner.",
  more: { label: "Read how it works", href: "/how-it-works" },
  steps: [
    { id: "describe", capture: "demoDescribe", label: "Describe", title: "Say what you want in a sentence.", body: "Type the app you have in mind, or start from a real starter template. The agent reads the project and writes a short plan before it touches a file.", facts: ["Plan first, then edits", "Any starter as a base"] },
    { id: "build", capture: "demoAgent", label: "Build", title: "Watch the files get written.", body: "The agent edits real files with tools you can see. Type-check and build run in an isolated sandbox, and the preview opens at desktop, tablet and phone sizes.", facts: ["Every tool call listed", "Errors read back and repaired"] },
    { id: "review", capture: "demoHistory", label: "Review", title: "Compare, keep or restore.", body: "A checkpoint is saved before every run. Open the diff of any file, keep what works and restore what does not, in one click.", facts: ["Diff any checkpoint", "Restore in one click"] },
    { id: "publish", capture: "demoPublish", label: "Publish", title: "Run the checks and go live.", body: "The pre-publish scan runs over your source, the build is uploaded, and the new version is served at your address. Add your own domain when you are ready.", facts: ["Scan before publish", "Versions kept for rollback"] },
  ],
} as const;

/** "Runs on Cloudflare": facts from docs/CLOUDFLARE.md and the services. */
export const HOME_PLATFORM_CF = {
  index: "Infrastructure",
  title: "Runs on Cloudflare. Isolated by design.",
  lead: "Generated code never runs inside the app. Each project gets its own container, hosted sites are served from object storage, and every version stays available for rollback.",
  tiles: [
    { id: "sandbox", icon: "box", title: "One sandbox per project", body: "A Container owned by a Durable Object, started on demand for previews, builds and terminal commands." },
    { id: "preview", icon: "monitor", title: "Previews in containers", body: "The live preview is proxied from the project's container to a per-project preview address." },
    { id: "r2", icon: "database", title: "Hosting on R2", body: "Published files and version-history snapshots live in R2 object storage, served by the Worker." },
    { id: "domains", icon: "globe", title: "Custom domains", body: "Add your domain in Publish → Domains; Codexa shows the TXT and CNAME records and verifies them." },
    { id: "rollback", icon: "history", title: "Rollbacks", body: "Every deployment is kept. Serve an earlier version at the same address in one click." },
    { id: "secrets", icon: "lock", title: "Secrets encrypted at rest", body: "Environment variables and connected-service keys are encrypted before storage and never returned to the browser." },
  ],
  diagram: {
    caption: "How a request travels: the browser reaches the Worker, which routes previews to the project's container and published sites to R2.",
    nodes: [
      { id: "browser", label: "Browser", sub: "your visitor" },
      { id: "worker", label: "Worker", sub: "routing, auth, API" },
      { id: "container", label: "Container", sub: "one per project" },
      { id: "r2", label: "R2", sub: "sites and snapshots" },
    ],
  },
  docs: { label: "How it fits together", href: "/security" },
};

export const HOME_GALLERY = {
  index: "Starters",
  title: "Start from a real app, not a blank page.",
  caption: "Screenshots captured from each starter template's own build. Hover a tile for the starter's name.",
  browse: { label: "Browse all starters", href: "/templates" },
};

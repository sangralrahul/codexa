/**
 * Copy and small data maps for the marketing home page (src/app/(marketing)/page.tsx).
 *
 * Honesty rules (CLAUDE.md, PLAN §1): no numbers live here. Every count on the home page is
 * imported from code or config at render time (TEMPLATES, toolSchemas, LIMITS, workspaceRoleEnum,
 * PLANS, the providers registry, the changelog). Template ids below are validated against
 * TEMPLATES on the server (src/components/marketing/home/scenarios.ts); unknown ids are dropped.
 */

export const HOME_HERO = {
  /** The H1, as two visual lines. `mark` gets the selection mark (once per page). */
  lines: ["From one sentence", "to a running app."],
  mark: "running app.",
  lead: "Codexa plans the files, writes real code, checks it in a sandbox and runs a live preview you can deploy. Every change is yours to edit or undo.",
  templatesLink: { label: "or start from a template", href: "/templates" },
  storyLink: { label: "See it build", href: "#watch-it-build" },
} as const;

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
  title: "Built in the open.",
  note: "Numbers read from Codexa's source. We don't publish usage or customer numbers.",
  platformLine: "Runs on Cloudflare Workers and Containers.",
};

export const HOME_WALL = {
  index: "02 — Start",
  title: "Start from something real.",
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
  index: "05 — Connect",
  title: "Connect real services, then test them live.",
  highlight: "then test them live.",
  lead: "Bring your own keys for AI providers, payments, email, databases and hosting. Secrets are encrypted before they are stored and never sent back to the browser.",
  trademark: "Trademarks belong to their owners; no partnership implied.",
};

export const HOME_PRICING = {
  index: "06 — Pricing",
  title: "Free to start. Priced in rupees and dollars.",
  highlight: "Priced in rupees and dollars.",
  lead: "Limits are enforced on the server for AI requests and tokens, runtime minutes, deployments, storage, projects and members.",
  chips: [
    { label: "INR & USD", icon: "rupee" },
    { label: "UPI via Razorpay", icon: "phone" },
    { label: "Stripe internationally", icon: "card" },
  ] as const,
  full: { label: "Full pricing, including Enterprise", href: "/pricing" },
};

export const HOME_FAQ = {
  index: "07 — Questions",
  title: "Questions, answered.",
  support: { label: "Still stuck? Contact support", href: "/support" },
};

export const HOME_FINAL = {
  title: "What will you build first?",
  highlight: "build first?",
  pricing: { label: "See pricing", href: "/pricing" },
};

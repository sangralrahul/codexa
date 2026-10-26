/**
 * Central public route manifest. Used by navigation, the sitemap, and tests
 * that assert every public route resolves. Keep in sync with src/app.
 */
export type RouteEntry = {
  path: string;
  title: string;
  description: string;
  group:
    | "product"
    | "solutions"
    | "templates"
    | "docs"
    | "api"
    | "learn"
    | "pricing"
    | "company"
    | "trust"
    | "auth"
    | "support";
  priority?: number;
  noindex?: boolean;
  /** Short, capitalised name for navigation, footers and breadcrumbs ("Startups", not "Codexa for startups"). */
  navLabel?: string;
};

const RAW_ROUTES: Omit<RouteEntry, "navLabel">[] = [
  // Product
  { path: "/", title: "Codexa — Turn ideas into working software", description: "Describe your idea. Codexa plans the files, writes real code, checks it in a sandbox and runs a preview you can deploy.", group: "product", priority: 1 },
  { path: "/product", title: "Product", description: "One workspace from prompt to production: app generation, a real editor, isolated runtimes, and deployment.", group: "product", priority: 0.9 },
  { path: "/features", title: "Features", description: "Everything in Codexa: AI generation, editor, preview, databases, integrations, version history, and deployment.", group: "product", priority: 0.9 },
  { path: "/how-it-works", title: "How it works", description: "From prompt to deployed application: how Codexa plans, generates, validates, runs, and ships your code.", group: "product", priority: 0.8 },
  { path: "/ai-app-builder", title: "AI App Builder", description: "Generate full-stack applications from natural language and iterate with an AI agent that edits real files.", group: "product", priority: 0.8 },
  { path: "/ai-website-builder", title: "AI Website Builder", description: "Build and deploy responsive websites from a prompt, with full code ownership.", group: "product", priority: 0.8 },
  { path: "/ai-code-generator", title: "AI Code Generator", description: "Generate, refactor, test, and document code in TypeScript, React, Node, and SQL.", group: "product", priority: 0.8 },
  { path: "/ai-agent", title: "AI Agent", description: "A bounded, tool-using agent that plans, edits files, runs builds, reads logs, and repairs errors.", group: "product", priority: 0.8 },
  { path: "/full-stack-development", title: "Full-stack development", description: "Frontend, backend, database, authentication, and APIs in one workspace.", group: "product", priority: 0.7 },
  { path: "/visual-editor", title: "Visual editor", description: "Preview your application, inspect the rendered output, and request targeted UI changes.", group: "product", priority: 0.7 },
  { path: "/code-editor", title: "Code editor", description: "A Monaco-based editor with tabs, search, diagnostics, diff view, and AI-assisted edits.", group: "product", priority: 0.7 },
  { path: "/app-deployment", title: "App deployment", description: "Build, deploy, and roll back applications with live logs and deployment history.", group: "product", priority: 0.7 },
  { path: "/integrations", title: "Integrations", description: "Databases, authentication, AI providers, payments, email, storage, hosting, and GitHub.", group: "product", priority: 0.8 },
  { path: "/alternatives", title: "Alternatives", description: "How Codexa compares with other AI development platforms, honestly.", group: "product", priority: 0.5 },

  // Solutions
  { path: "/solutions", title: "Solutions", description: "Codexa for startups, developers, students, agencies, enterprises, and more.", group: "solutions", priority: 0.7 },
  { path: "/solutions/startups", title: "Codexa for startups", description: "Ship an MVP in days and keep iterating with real code.", group: "solutions" },
  { path: "/solutions/indie-hackers", title: "Codexa for indie hackers", description: "Build and launch side projects without an ops team.", group: "solutions" },
  { path: "/solutions/developers", title: "Codexa for developers", description: "An AI pair that edits real files, runs builds, and respects your code.", group: "solutions" },
  { path: "/solutions/students", title: "Codexa for students", description: "Learn by building real applications with explanations at every step.", group: "solutions" },
  { path: "/solutions/founders", title: "Codexa for founders", description: "Validate ideas with working software, not slides.", group: "solutions" },
  { path: "/solutions/agencies", title: "Codexa for agencies", description: "Deliver client projects faster with shared workspaces and templates.", group: "solutions" },
  { path: "/solutions/enterprise", title: "Codexa for enterprise", description: "Isolation, audit logs, roles, and custom limits for larger organizations.", group: "solutions" },
  { path: "/solutions/education", title: "Codexa for education", description: "Classrooms and bootcamps that teach with real projects.", group: "solutions" },
  { path: "/solutions/ecommerce", title: "Codexa for ecommerce", description: "Storefronts, catalogs, carts, and payment integrations.", group: "solutions" },
  { path: "/solutions/healthcare", title: "Codexa for healthcare", description: "Internal tools and patient-facing prototypes, with clear compliance boundaries.", group: "solutions" },
  { path: "/solutions/fintech", title: "Codexa for fintech", description: "Dashboards, onboarding flows, and payment integrations with server-side controls.", group: "solutions" },
  { path: "/solutions/saas", title: "Codexa for SaaS", description: "Multi-tenant apps with auth, billing, and admin panels.", group: "solutions" },
  { path: "/solutions/internal-tools", title: "Codexa for internal tools", description: "Admin panels, dashboards, and workflow tools in hours.", group: "solutions" },
  { path: "/solutions/nonprofits", title: "Codexa for nonprofits", description: "Donation pages, volunteer tools, and program sites.", group: "solutions" },

  // Templates & showcase
  { path: "/templates", title: "Templates", description: "Starter projects with real files and documented dependencies.", group: "templates", priority: 0.8 },
  { path: "/templates/websites", title: "Website templates", description: "Marketing and content websites.", group: "templates" },
  { path: "/templates/web-apps", title: "Web app templates", description: "Interactive single-page and full-stack applications.", group: "templates" },
  { path: "/templates/saas", title: "SaaS templates", description: "Multi-tenant SaaS starters.", group: "templates" },
  { path: "/templates/dashboards", title: "Dashboard templates", description: "Analytics and operational dashboards.", group: "templates" },
  { path: "/templates/ecommerce", title: "Ecommerce templates", description: "Storefront and catalog starters.", group: "templates" },
  { path: "/templates/portfolios", title: "Portfolio templates", description: "Personal and agency portfolios.", group: "templates" },
  { path: "/templates/ai-tools", title: "AI tool templates", description: "Chat, generation, and assistant starters.", group: "templates" },
  { path: "/templates/admin-panels", title: "Admin panel templates", description: "CRUD and management interfaces.", group: "templates" },
  { path: "/templates/crm", title: "CRM templates", description: "Contacts, pipelines, and activity tracking.", group: "templates" },
  { path: "/templates/landing-pages", title: "Landing page templates", description: "Conversion-focused single pages.", group: "templates" },
  { path: "/templates/mobile-first", title: "Mobile-first templates", description: "Responsive starters designed for phones first.", group: "templates" },
  { path: "/showcase", title: "Showcase", description: "Real projects built and published by the Codexa community.", group: "templates" },

  // Docs
  { path: "/docs", title: "Documentation", description: "Guides and reference for building with Codexa.", group: "docs", priority: 0.9 },
  { path: "/docs/getting-started", title: "Getting started", description: "Create an account and your first project.", group: "docs" },
  { path: "/docs/quickstart", title: "Quickstart", description: "From prompt to preview in five minutes.", group: "docs" },
  { path: "/docs/prompting", title: "Prompting", description: "How to write prompts that produce good applications.", group: "docs" },
  { path: "/docs/projects", title: "Projects", description: "Project structure, settings, files, and snapshots.", group: "docs" },
  { path: "/docs/editor", title: "Editor", description: "Editing files, search, diffs, and keyboard shortcuts.", group: "docs" },
  { path: "/docs/ai-agent", title: "AI agent", description: "How the agent plans, edits, validates, and repairs.", group: "docs" },
  { path: "/docs/databases", title: "Databases", description: "Connecting PostgreSQL and Supabase, migrations, and queries.", group: "docs" },
  { path: "/docs/authentication", title: "Authentication", description: "Adding authentication to generated applications.", group: "docs" },
  { path: "/docs/integrations", title: "Integrations", description: "Connecting third-party services.", group: "docs" },
  { path: "/docs/environment-variables", title: "Environment variables", description: "Managing secrets for previews and deployments.", group: "docs" },
  { path: "/docs/deployment", title: "Deployment", description: "Deploying with Codexa hosting and Vercel.", group: "docs" },
  { path: "/docs/custom-domains", title: "Custom domains", description: "Pointing your domain at a deployment.", group: "docs" },
  { path: "/docs/github", title: "GitHub", description: "Importing, committing, and pushing to GitHub.", group: "docs" },
  { path: "/docs/billing", title: "Billing", description: "Plans, usage, invoices, and cancellation.", group: "docs" },
  { path: "/docs/troubleshooting", title: "Troubleshooting", description: "Common errors and how to fix them.", group: "docs" },
  { path: "/docs/security", title: "Security", description: "How Codexa isolates projects and protects secrets.", group: "docs" },
  { path: "/developers", title: "Developers", description: "API, SDK, CLI, and webhooks for building on Codexa.", group: "api" },
  { path: "/api", title: "API", description: "Overview of the Codexa HTTP API.", group: "api" },
  { path: "/api/reference", title: "API reference", description: "Every implemented endpoint with request and response shapes.", group: "api" },
  { path: "/api/authentication", title: "API authentication", description: "Session cookies and API tokens.", group: "api" },
  { path: "/api/projects", title: "Projects API", description: "Create, list, update, and delete projects and files.", group: "api" },
  { path: "/api/generations", title: "Generations API", description: "Start and stream AI generation runs.", group: "api" },
  { path: "/api/deployments", title: "Deployments API", description: "Create deployments and read logs.", group: "api" },
  { path: "/api/webhooks", title: "Webhooks", description: "Inbound billing webhooks and their guarantees.", group: "api" },
  { path: "/sdk", title: "SDK", description: "Status of the Codexa SDK.", group: "api" },
  { path: "/cli", title: "CLI", description: "Status of the Codexa CLI.", group: "api" },

  // Learn
  { path: "/learn", title: "Learn", description: "Guides, tutorials, and articles on building with AI.", group: "learn", priority: 0.7 },
  { path: "/blog", title: "Blog", description: "Product updates and engineering notes.", group: "learn" },
  { path: "/guides", title: "Guides", description: "Step-by-step guides for common projects.", group: "learn" },
  { path: "/guides/build-your-first-app", title: "Build your first app", description: "A complete walkthrough for beginners.", group: "learn" },
  { path: "/guides/build-a-saas", title: "Build a SaaS", description: "Auth, billing, and multi-tenancy.", group: "learn" },
  { path: "/guides/build-an-ecommerce-store", title: "Build an ecommerce store", description: "Catalog, cart, and checkout.", group: "learn" },
  { path: "/guides/connect-a-database", title: "Connect a database", description: "PostgreSQL and Supabase in your project.", group: "learn" },
  { path: "/guides/deploy-your-first-app", title: "Deploy your first app", description: "From preview to a live URL.", group: "learn" },
  { path: "/guides/ai-app-development", title: "AI app development", description: "Building apps that call AI providers safely.", group: "learn" },
  { path: "/tutorials", title: "Tutorials", description: "Hands-on tutorials.", group: "learn" },
  { path: "/glossary", title: "Glossary", description: "Terms used across Codexa.", group: "learn" },
  { path: "/webinars", title: "Webinars", description: "Live sessions and recordings.", group: "learn" },
  { path: "/newsletter", title: "Newsletter", description: "Product updates in your inbox.", group: "learn" },

  // Pricing
  { path: "/pricing", title: "Pricing", description: "Free, Pro, Team, and Enterprise plans in INR and USD.", group: "pricing", priority: 0.9 },
  { path: "/pricing/compare-plans", title: "Compare plans", description: "Every limit and feature side by side.", group: "pricing" },
  { path: "/credits", title: "Credits", description: "How AI requests and tokens are counted.", group: "pricing" },
  { path: "/usage", title: "Usage", description: "How usage is measured and where to see it.", group: "pricing" },
  { path: "/students", title: "Students", description: "Codexa for students.", group: "pricing" },
  { path: "/startup-program", title: "Startup program", description: "Support for early-stage startups.", group: "pricing" },
  { path: "/teams", title: "Teams", description: "Collaboration features for teams.", group: "pricing" },
  { path: "/enterprise", title: "Enterprise", description: "Codexa for large organizations.", group: "pricing" },
  { path: "/contact-sales", title: "Contact sales", description: "Talk to us about Team and Enterprise plans.", group: "pricing" },
  { path: "/request-demo", title: "Request a demo", description: "See Codexa in action.", group: "pricing" },
  { path: "/billing-faq", title: "Billing FAQ", description: "Answers about invoices, taxes, and payments.", group: "pricing" },
  { path: "/refund-policy", title: "Refund policy", description: "When and how refunds are issued.", group: "pricing" },

  // Company
  { path: "/about", title: "About", description: "Who builds Codexa and why.", group: "company" },
  { path: "/mission", title: "Mission", description: "Make building software accessible to everyone.", group: "company" },
  { path: "/careers", title: "Careers", description: "Open roles at Codexa.", group: "company" },
  { path: "/press", title: "Press", description: "Press information and contact.", group: "company" },
  { path: "/press-kit", title: "Press kit", description: "Logos and product descriptions.", group: "company" },
  { path: "/brand", title: "Brand", description: "The Codexa brand.", group: "company" },
  { path: "/brand-guidelines", title: "Brand guidelines", description: "How to use the Codexa name and marks.", group: "company" },
  { path: "/partners", title: "Partners", description: "Partnership opportunities.", group: "company" },
  { path: "/affiliate-program", title: "Affiliate program", description: "Status of the affiliate program.", group: "company" },
  { path: "/contact", title: "Contact", description: "Get in touch.", group: "company" },
  { path: "/support", title: "Support", description: "Help with your account and projects.", group: "support" },
  { path: "/community", title: "Community", description: "Where the Codexa community meets.", group: "company" },
  { path: "/roadmap", title: "Roadmap", description: "What we are building next.", group: "company" },
  { path: "/changelog", title: "Changelog", description: "Product releases.", group: "company" },
  { path: "/status", title: "Status", description: "Live platform status.", group: "company" },

  // Trust
  { path: "/security", title: "Security", description: "How Codexa protects your code, data, and runtimes.", group: "trust" },
  { path: "/trust", title: "Trust", description: "Our commitments on security, privacy, and reliability.", group: "trust" },
  { path: "/trust-center", title: "Trust center", description: "Policies, practices, and how to reach us.", group: "trust" },
  { path: "/privacy", title: "Privacy policy", description: "How we collect and use data.", group: "trust" },
  { path: "/terms", title: "Terms of service", description: "The terms for using Codexa.", group: "trust" },
  { path: "/acceptable-use", title: "Acceptable use", description: "What you may and may not build or run.", group: "trust" },
  { path: "/cookie-policy", title: "Cookie policy", description: "Cookies Codexa uses.", group: "trust" },
  { path: "/data-processing", title: "Data processing", description: "Data processing terms.", group: "trust" },
  { path: "/subprocessors", title: "Subprocessors", description: "Third parties that process data on our behalf.", group: "trust" },
  { path: "/responsible-disclosure", title: "Responsible disclosure", description: "How to report vulnerabilities.", group: "trust" },
  { path: "/vulnerability-reporting", title: "Vulnerability reporting", description: "Report a security issue.", group: "trust" },
  { path: "/accessibility", title: "Accessibility", description: "Our accessibility commitments.", group: "trust" },
  { path: "/data-retention", title: "Data retention", description: "How long we keep data.", group: "trust" },
  { path: "/ai-policy", title: "AI policy", description: "How Codexa uses AI providers and your data.", group: "trust" },

  // Auth & conversion (noindex)
  { path: "/login", title: "Sign in", description: "Sign in to Codexa.", group: "auth", noindex: true },
  { path: "/signup", title: "Create your account", description: "Start building for free.", group: "auth", noindex: true },
  { path: "/forgot-password", title: "Forgot password", description: "Reset your password.", group: "auth", noindex: true },
  { path: "/reset-password", title: "Reset password", description: "Choose a new password.", group: "auth", noindex: true },
  { path: "/verify-email", title: "Verify email", description: "Confirm your email address.", group: "auth", noindex: true },
  { path: "/onboarding", title: "Onboarding", description: "Set up your workspace.", group: "auth", noindex: true },
  { path: "/new-project", title: "New project", description: "Create a project.", group: "auth", noindex: true },
  { path: "/import-project", title: "Import project", description: "Import from GitHub.", group: "auth", noindex: true },
  { path: "/connect-github", title: "Connect GitHub", description: "Link your GitHub account.", group: "auth", noindex: true },

  // Support & utility
  { path: "/help", title: "Help center", description: "Answers to common questions.", group: "support" },
  { path: "/faq", title: "FAQ", description: "Frequently asked questions.", group: "support" },
  { path: "/feedback", title: "Feedback", description: "Tell us what to improve.", group: "support" },
  { path: "/report-bug", title: "Report a bug", description: "Report a problem.", group: "support" },
  { path: "/request-feature", title: "Request a feature", description: "Suggest a feature.", group: "support" },
  { path: "/system-requirements", title: "System requirements", description: "What you need to use Codexa.", group: "support" },
  { path: "/browser-support", title: "Browser support", description: "Supported browsers.", group: "support" },
  { path: "/access-denied", title: "Access denied", description: "You do not have access to this page.", group: "support", noindex: true },
  { path: "/maintenance", title: "Maintenance", description: "Codexa is undergoing maintenance.", group: "support", noindex: true },
];

/** Short labels where the title is too long or reads badly out of context. Everything else is derived from the title. */
const NAV_LABELS: Record<string, string> = {
  "/": "Home",
  "/ai-app-builder": "AI app builder",
  "/ai-website-builder": "AI website builder",
  "/ai-code-generator": "Code generator",
  "/ai-agent": "AI agent",
  "/full-stack-development": "Full-stack",
  "/app-deployment": "Deployment",
  "/solutions/saas": "SaaS",
  "/docs": "Docs",
  "/api": "API",
  "/api/reference": "API reference",
  "/help": "Help center",
  "/pricing/compare-plans": "Compare plans",
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/cookie-policy": "Cookies",
  "/refund-policy": "Refunds",
  "/ai-policy": "AI policy",
  "/request-demo": "Request a demo",
};

/** "Codexa for indie hackers" → "Indie hackers". */
function deriveLabel(title: string): string {
  const t = title.replace(/^Codexa for /, "").replace(/^Codexa — .*/, "Home");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const PUBLIC_ROUTES: RouteEntry[] = RAW_ROUTES.map((r) => ({ ...r, navLabel: NAV_LABELS[r.path] ?? deriveLabel(r.title) }));

export const routeByPath = new Map(PUBLIC_ROUTES.map((r) => [r.path, r]));

export function getRoute(path: string): RouteEntry | undefined {
  return routeByPath.get(path);
}

/** The capitalised short name of a manifest route (falls back to the path). */
export function navLabel(path: string): string {
  return routeByPath.get(path)?.navLabel ?? path;
}

/**
 * Header mega menus. Every href is a manifest route (tests/unit/website/routes.test.ts).
 * `well` picks the featured preview shown beside the list while the item is hovered or focused.
 */
export type NavWell = "builder" | "agent" | "editor" | "deploy" | "integrations" | "templates" | "changelog" | "docs" | "solution" | "company" | "security" | "status";
export type NavItem = { label: string; href: string; description: string; well: NavWell; template?: string };

export const NAV = {
  product: [
    { label: "AI app builder", href: "/ai-app-builder", description: "A sentence in, a real project out", well: "builder" },
    { label: "AI agent", href: "/ai-agent", description: "Plans, edits, validates, repairs", well: "agent" },
    { label: "Code editor", href: "/code-editor", description: "Monaco, diffs, snapshots, search", well: "editor" },
    { label: "Deployment", href: "/app-deployment", description: "Ship, keep history, roll back", well: "deploy" },
    { label: "Integrations", href: "/integrations", description: "Databases, payments, email, GitHub", well: "integrations" },
  ],
  solutions: [
    { label: "Startups", href: "/solutions/startups", description: "An MVP you can keep building on", well: "solution", template: "vite-react-saas" },
    { label: "Founders", href: "/solutions/founders", description: "Working software instead of slides", well: "solution", template: "vite-react-landing" },
    { label: "Developers", href: "/solutions/developers", description: "An agent that respects your code", well: "solution", template: "vite-react-admin" },
    { label: "Students", href: "/solutions/students", description: "Learn by shipping real projects", well: "solution", template: "vite-react-portfolio" },
    { label: "Agencies", href: "/solutions/agencies", description: "Client work, shared workspaces", well: "solution", template: "vite-react-storefront" },
    { label: "Enterprise", href: "/solutions/enterprise", description: "Isolation, roles, custom limits", well: "solution", template: "vite-react-ops-dashboard" },
  ],
  resources: [
    { label: "Docs", href: "/docs", description: "Guides and reference for every feature", well: "docs" },
    { label: "Templates", href: "/templates", description: "Starters with real files and screenshots", well: "templates" },
    { label: "Guides", href: "/guides", description: "Complete walkthroughs, start to deploy", well: "docs" },
    { label: "Changelog", href: "/changelog", description: "What shipped, release by release", well: "changelog" },
    { label: "Blog", href: "/blog", description: "Product notes and engineering", well: "changelog" },
    { label: "Community", href: "/community", description: "Discussions and issues on GitHub", well: "changelog" },
  ],
  company: [
    { label: "About", href: "/about", description: "Who builds Codexa, and how", well: "company" },
    { label: "Security", href: "/security", description: "What is implemented, plainly", well: "security" },
    { label: "Status", href: "/status", description: "Live checks of every component", well: "status" },
    { label: "Careers", href: "/careers", description: "How we work; roles when they open", well: "company" },
    { label: "Contact", href: "/contact", description: "Support, sales, security, privacy", well: "company" },
  ],
} as const satisfies Record<string, readonly NavItem[]>;

/** Footer columns: at most seven links each, plus an "All …" link (FOOTER_MORE). */
export const FOOTER = {
  Product: ["/features", "/how-it-works", "/ai-app-builder", "/ai-agent", "/code-editor", "/app-deployment", "/pricing"],
  Solutions: ["/solutions/startups", "/solutions/founders", "/solutions/developers", "/solutions/students", "/solutions/agencies", "/solutions/saas", "/solutions/enterprise"],
  Resources: ["/docs", "/templates", "/guides", "/blog", "/changelog", "/roadmap", "/status"],
  Company: ["/about", "/mission", "/careers", "/press", "/brand", "/partners", "/contact"],
  Legal: ["/privacy", "/terms", "/acceptable-use", "/cookie-policy", "/security", "/ai-policy", "/refund-policy"],
} as const;

export const FOOTER_MORE: Record<keyof typeof FOOTER, { label: string; href: string }> = {
  Product: { label: "Product overview", href: "/product" },
  Solutions: { label: "All solutions", href: "/solutions" },
  Resources: { label: "All resources", href: "/learn" },
  Company: { label: "Support", href: "/support" },
  Legal: { label: "Trust center", href: "/trust-center" },
};

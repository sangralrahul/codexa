/**
 * Public roadmap. "Now" is the initial release; "Next" and "Later" are
 * intentions, not commitments. No dates are attached on purpose.
 */
export type RoadmapItem = { title: string; description: string; href?: string };
export type RoadmapColumn = { id: "now" | "next" | "later"; title: string; summary: string; items: RoadmapItem[] };

export const ROADMAP: RoadmapColumn[] = [
  {
    id: "now",
    title: "Now",
    summary: "Shipping in the initial 0.1.0 release.",
    items: [
      { title: "Accounts and workspaces", description: "Email/password signup with verification, password reset, sessions, GitHub sign-in when configured, personal and team workspaces with owner/admin/editor/viewer roles and email invitations.", href: "/changelog/platform-foundation" },
      { title: "Projects, editor and snapshots", description: "Templates for React + Vite, static sites and Node + Express; Monaco editor with tabs, explorer, search and replace, diagnostics, diff view and autosave; named snapshots with per-file diffs and restore.", href: "/changelog/workspace-and-editor" },
      { title: "AI agent", description: "Anthropic and OpenAI provider abstraction; Build, Ask and Fix modes; tool-based file edits; sandbox validation; bounded repair loop; snapshot before every run; review and revert.", href: "/changelog/ai-agent" },
      { title: "Sandboxed runtime and previews", description: "Isolated sandboxes (namespaces, cgroups, timeouts; Docker and E2B drivers), host-based preview proxy, streamed logs and viewport controls.", href: "/changelog/runtime-and-previews" },
      { title: "Deployments", description: "Codexa static hosting with history and rollback; Vercel adapter that needs a token; CNAME instructions for custom domains.", href: "/changelog/deployments" },
      { title: "Integrations", description: "GitHub import and push, PostgreSQL and Supabase connections with schema browser and SQL runner, workspace connections for AI, payment, email and hosting providers.", href: "/changelog/integrations" },
      { title: "Billing, teams and admin", description: "Free/Pro/Team/Enterprise plans in INR and USD, Stripe and Razorpay adapters with idempotent webhooks, server-side usage limits, staff admin area.", href: "/changelog/billing-and-teams" },
    ],
  },
  {
    id: "next",
    title: "Next",
    summary: "Being designed or built. Order may change.",
    items: [
      { title: "Next.js full-stack template", description: "A fourth framework with server routes, so generated apps can include their own backend without a separate Express project.", href: "/docs/deployment" },
      { title: "API tokens", description: "Personal access tokens so scripts and CI can call the HTTP API without a browser session.", href: "/api/authentication" },
      { title: "Concurrent editing", description: "Conflict-free collaborative editing on top of the existing presence service.", href: "/docs/projects" },
      { title: "Custom domain verification", description: "Automatic DNS verification and certificate issuance for custom domains instead of manual CNAME setup.", href: "/docs/custom-domains" },
      { title: "Vercel deployment verification", description: "End-to-end testing of the Vercel adapter against real accounts so it can be marked as fully supported.", href: "/docs/deployment" },
    ],
  },
  {
    id: "later",
    title: "Later",
    summary: "Ideas we intend to pursue after the items above.",
    items: [
      { title: "SDK and CLI", description: "A typed client library and a command-line tool built on the API tokens work.", href: "/sdk" },
      { title: "SSO / SAML", description: "Single sign-on for Enterprise workspaces.", href: "/enterprise" },
      { title: "Native mobile apps", description: "Review runs, previews and deployments from a phone." },
      { title: "Affiliate program", description: "Not launched; status is tracked on the affiliate program page.", href: "/affiliate-program" },
    ],
  },
];

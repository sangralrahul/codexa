import type { ContentPage, FAQItem } from "./types";
import { site } from "@/config/site";

const sup = site.company.supportEmail;

export const PRICING_FAQ: FAQItem[] = [
  { question: "Is the Free plan really free?", answer: "Yes. No card is required. It is limited to 3 projects, 50 AI requests and 500,000 tokens a month, 5 hours of preview runtime, 5 deployments, and 250 MB of storage." },
  { question: "What counts as an AI request?", answer: "One generation run (Build, Ask, or Fix). Tokens are the input and output tokens the provider reports for that run. See [credits](/credits)." },
  { question: "What happens when I hit a limit?", answer: "The server rejects the action with a clear message and the usage page shows what is used. Nothing is deleted. Upgrade or wait for the next monthly period, which starts on the first of the month (UTC)." },
  { question: "Can I pay in INR?", answer: "Yes. INR prices are billed through Razorpay (UPI, cards, net banking). USD prices are billed through Stripe. GST or local taxes are added at checkout." },
  { question: "Monthly or annual?", answer: "Both. Annual billing is charged up front at the discounted monthly rate shown with the Annual toggle." },
  { question: "How do I cancel?", answer: "From Settings, Billing. Your plan stays active until the end of the paid period, then drops to Free. See the [refund policy](/refund-policy)." },
  { question: "Does Enterprise have a price?", answer: "No fixed price. Enterprise is priced per agreement with custom limits, invoice billing, and security questionnaire support. [Contact sales](/contact-sales)." },
  { question: "Do I need my own AI API key?", answer: "The operator of your Codexa instance configures Anthropic or OpenAI keys. On hosted Codexa those are provided within your plan limits. Self-hosted instances bring their own." },
];

export const PRICING_PAGES: Record<string, ContentPage> = {
  "/credits": {
    path: "/credits",
    eyebrow: "Pricing",
    title: "How AI requests and tokens are counted",
    intro: "Codexa does not use an abstract \"credit\" currency. Plans include a number of AI requests and a number of tokens per month, both measured exactly as the server records them.",
    sections: [
      { id: "requests", heading: "AI requests", blocks: [{ type: "paragraph", text: "One AI request is one generation run started from the chat panel in Build, Ask, or Fix mode. A run may involve several model calls (plan, edits, repair attempts) but it counts as one request. Cancelled runs still count because the provider has already done work." }] },
      { id: "tokens", heading: "Tokens", blocks: [{ type: "paragraph", text: "After every run the provider reports input and output tokens. Codexa records the sum as an `ai_tokens` usage event for the workspace. Tokens are counted across all model calls in the run, including repair attempts, so a run that needs two repairs uses more tokens than one that passes validation first time." }] },
      {
        id: "limits",
        heading: "What each plan includes",
        blocks: [
          { type: "table", caption: "AI limits per month", columns: ["Plan", "AI requests", "AI tokens"], rows: [["Free", "50", "500,000"], ["Pro", "1,000", "10,000,000"], ["Team", "5,000", "50,000,000"], ["Enterprise", "Custom", "Custom"]] },
          { type: "paragraph", text: "Limits apply per workspace, not per user. In a Team workspace all members share the pool." },
        ],
      },
      { id: "enforcement", heading: "How limits are enforced", blocks: [{ type: "paragraph", text: "Before a run starts the server checks the workspace's usage for the current period against the plan (`assertQuota`). If starting the run would exceed either the request or the token limit, it is refused with a `quota_exceeded` error that names the limit and the amount used. Usage recorded so far is never adjusted downwards." }] },
      { id: "period", heading: "Billing period", blocks: [{ type: "paragraph", text: "Usage periods are calendar months in UTC, starting on the first of the month. Unused requests and tokens do not roll over. Changing plans mid-month applies the new limits immediately to the current period's usage." }] },
      { id: "where", heading: "Where to see usage", blocks: [{ type: "paragraph", text: "Settings, Billing shows requests, tokens, runtime minutes, deployments, and storage for the current period. See [usage](/usage)." }] },
    ],
    cta: { title: "See the plans", primary: { label: "Pricing", href: "/pricing" }, secondary: { label: "Compare plans", href: "/pricing/compare-plans" } },
  },

  "/usage": {
    path: "/usage",
    eyebrow: "Pricing",
    title: "How usage is measured",
    intro: "Every plan limit is enforced on the server from recorded usage events. This page explains what is measured, when, and where you can see it.",
    sections: [
      {
        id: "kinds",
        heading: "What is measured",
        blocks: [
          { type: "table", caption: "Usage kinds", columns: ["Kind", "Unit", "Recorded when"], rows: [
            ["AI requests", "1 per run", "A generation run starts"],
            ["AI tokens", "Tokens reported by the provider", "A run finishes or is cancelled"],
            ["Runtime minutes", "Minutes a sandbox is running", "A preview session stops, or periodically while running"],
            ["Deployments", "1 per deployment", "A deployment is created"],
            ["Storage", "Bytes of project files and snapshots", "Files are written"],
          ] },
          { type: "paragraph", text: "Projects and members are counted directly rather than as events: creating a fourth project on Free, or inviting an eleventh member on Team, is refused." },
        ],
      },
      { id: "period", heading: "Periods", blocks: [{ type: "paragraph", text: "Monthly usage resets on the first of each calendar month at 00:00 UTC. Storage is a running total, not a monthly counter." }] },
      { id: "where", heading: "Where to see it", blocks: [{ type: "paragraph", text: "Open [Settings, Billing](/settings/billing) in your workspace for the current period's usage, remaining allowances, and your plan. Workspace owners and admins can see it; editors and viewers see their plan but not billing details." }] },
      { id: "api", heading: "Through the API", blocks: [{ type: "paragraph", text: "`GET /api/v1/workspaces/:id/usage` returns `{ plan, limits, used, remaining, periodStart }` for members of the workspace. See the [API reference](/api/reference)." }] },
      { id: "over", heading: "When you go over", blocks: [{ type: "paragraph", text: "The action is refused with a message naming the limit. Existing projects, deployments, and data are untouched. Upgrade from Settings, Billing or wait for the next period." }] },
    ],
    cta: { title: "Need more?", primary: { label: "See pricing", href: "/pricing" }, secondary: { label: "How tokens are counted", href: "/credits" } },
  },

  "/students": {
    path: "/students",
    eyebrow: "Pricing",
    title: "Codexa for students",
    intro: "The Free plan is designed to be enough for coursework and first projects. A dedicated student discount is in review; here is what exists today.",
    sections: [
      { id: "free", heading: "What the Free plan gives you", blocks: [{ type: "list", items: ["3 projects, each with real files you can push to GitHub.", "50 AI requests and 500,000 tokens a month when the operator has configured an AI provider.", "5 hours of sandbox runtime and 5 deployments a month.", "The full editor, snapshots, diffs, and share links."] }] },
      { id: "discount", heading: "Student discount", blocks: [{ type: "note", variant: "info", title: "In review", text: "We have not launched a student discount or verification process yet. When we do, it will be announced in the [changelog](/changelog). Until then there is no student-specific pricing, and we would rather say so than invent a percentage." }] },
      { id: "learn", heading: "Learning with Codexa", blocks: [{ type: "paragraph", text: "Ask mode explains code without changing it, every AI run shows its plan and diff, and the [guides](/guides) walk through complete projects. See [Codexa for students](/solutions/students) and [education](/solutions/education)." }] },
    ],
    cta: { title: "Start with the Free plan", primary: { label: "Start Building Free", href: "/signup" }, secondary: { label: "Guides", href: "/guides" } },
  },

  "/startup-program": {
    path: "/startup-program",
    eyebrow: "Pricing",
    title: "Startup programme",
    intro: "A programme for early-stage startups is in review. There are no credits or discounts to claim yet; register interest and we will tell you when it opens.",
    sections: [
      { id: "status", heading: "Status", blocks: [{ type: "note", variant: "info", title: "In review", text: "Eligibility, credit amounts, and duration have not been decided. Nothing on this page is an offer." }] },
      { id: "today", heading: "What you can do today", blocks: [{ type: "list", items: ["Start on Free and move to Pro (single builder) or Team (up to 10 members) when you need more.", "Pay in INR through Razorpay or USD through Stripe; annual billing is discounted.", "Use the [startups solution page](/solutions/startups) for a typical MVP workflow."] }] },
    ],
  },

  "/teams": {
    path: "/teams",
    eyebrow: "Pricing",
    title: "Codexa for teams",
    intro: "Team workspaces add members, roles, shared projects, activity history, and priority support on top of everything in Pro.",
    sections: [
      { id: "roles", heading: "Roles", blocks: [{ type: "definitions", items: [{ term: "Owner", detail: "Billing, members, deletion, and everything below." }, { term: "Admin", detail: "Manage members, integrations, and project settings." }, { term: "Editor", detail: "Create and edit projects, run the agent, deploy." }, { term: "Viewer", detail: "Read projects, previews, and history." }] }] },
      { id: "collab", heading: "Working together", blocks: [{ type: "list", items: ["Email invitations with a role; members accept with their own account.", "Realtime presence shows who is viewing which file.", "Activity history per project records who changed what.", "Share links for people outside the workspace.", "Concurrent editing of one file by several people is on the roadmap, not shipped."] }] },
      { id: "limits", heading: "Team plan limits", blocks: [{ type: "table", caption: "Team plan", columns: ["Limit", "Team"], rows: [["Members", "10"], ["Projects", "100"], ["AI requests / month", "5,000"], ["AI tokens / month", "50,000,000"], ["Runtime", "500 hours / month"], ["Deployments / month", "500"], ["Storage", "25 GB"], ["Custom domains", "20"]] }] },
      { id: "more", heading: "Need more than 10 members?", blocks: [{ type: "paragraph", text: "[Enterprise](/enterprise) has custom limits, invoice billing, and security questionnaire support." }] },
    ],
    cta: { title: "Start a Team workspace", primary: { label: "Start a Team", href: "/signup?plan=team" }, secondary: { label: "Compare plans", href: "/pricing/compare-plans" } },
  },

  "/enterprise": {
    path: "/enterprise",
    eyebrow: "Pricing",
    title: "Codexa for enterprise",
    intro: "Custom usage limits, dedicated environments, invoice billing, and support for your security review. Priced per agreement.",
    sections: [
      { id: "included", heading: "What Enterprise adds", blocks: [{ type: "list", items: ["Custom limits for projects, members, AI requests and tokens, runtime, deployments, and storage.", "Dedicated environments (a separate Codexa instance with its own database and runner).", "Audit log export on request.", "Security questionnaire support and a signed data processing agreement.", "Invoice billing in INR or USD."] }] },
      { id: "not-yet", heading: "Not available yet", blocks: [{ type: "note", variant: "warning", title: "Say so up front", text: "SSO/SAML is on the roadmap and not shipped. We hold no third-party certifications (SOC 2, ISO 27001). See the [security page](/security) for what is implemented." }] },
      { id: "process", heading: "How it works", blocks: [{ type: "list", ordered: true, items: ["Tell us about your team and requirements with the form below.", "We reply by email to arrange a call and a demo.", "We agree limits, environment, and terms, then provision the workspace."] }] },
    ],
  },

  "/billing-faq": {
    path: "/billing-faq",
    eyebrow: "Pricing",
    title: "Billing FAQ",
    intro: "Answers about invoices, taxes, payment methods, and what happens when you change or cancel a plan.",
    sections: [
      { id: "payment", heading: "Payment methods", blocks: [{ type: "definitions", items: [{ term: "INR", detail: "Razorpay: UPI, Indian credit and debit cards, net banking. GST is added at checkout." }, { term: "USD", detail: "Stripe: international credit and debit cards. Sales tax or VAT is added where applicable." }] }, { type: "note", variant: "info", text: "A payment provider must be configured by the operator of your Codexa instance. If checkout shows \"not configured\", the instance has not enabled that provider." }] },
      { id: "invoices", heading: "Invoices", blocks: [{ type: "paragraph", text: "Invoices are issued by the payment provider at each renewal and are listed under Settings, Billing. Enterprise customers are invoiced directly." }] },
      { id: "changes", heading: "Changing plans", blocks: [{ type: "paragraph", text: "Upgrades apply immediately and are prorated by the payment provider. Downgrades take effect at the end of the current period. New limits apply to the current usage period as soon as the plan changes." }] },
      { id: "cancel", heading: "Cancelling", blocks: [{ type: "paragraph", text: "Cancel from Settings, Billing. Access continues until the period ends, then the workspace drops to Free limits. Projects beyond the Free limit become read-only until you delete some or upgrade; nothing is deleted automatically." }] },
      { id: "failed", heading: "Failed payments", blocks: [{ type: "paragraph", text: "The subscription enters a past-due state and the provider retries. Your plan limits stay in place during the retry window. If payment ultimately fails the workspace returns to Free." }] },
      { id: "webhooks", heading: "Why is my plan not updated yet?", blocks: [{ type: "paragraph", text: "Plan changes are confirmed by webhooks from Stripe or Razorpay, which are processed idempotently. This usually takes seconds; if it takes longer than a few minutes, contact support with your workspace name." }] },
      { id: "refunds", heading: "Refunds", blocks: [{ type: "paragraph", text: "See the [refund policy](/refund-policy)." }] },
      { id: "help", heading: "Still stuck?", blocks: [{ type: "paragraph", text: `Email [${sup}](mailto:${sup}) or use the [support form](/support).` }] },
    ],
  },

  "/refund-policy": {
    path: "/refund-policy",
    eyebrow: "Legal",
    title: "Refund policy",
    intro: "When and how Codexa issues refunds for paid plans. Draft pending legal review.",
    review: "legal",
    updated: "2026-10-24",
    sections: [
      { id: "monthly", heading: "Monthly plans", blocks: [{ type: "paragraph", text: "Monthly charges are not refunded once the period has started, except where required by law or where a billing error occurred. Cancel before renewal to avoid the next charge." }] },
      { id: "annual", heading: "Annual plans", blocks: [{ type: "paragraph", text: "You may request a refund of an annual charge within 14 days of the initial purchase if usage in the workspace has been minimal. After 14 days annual charges are non-refundable, but you can cancel to stop renewal." }] },
      { id: "errors", heading: "Billing errors and duplicates", blocks: [{ type: "paragraph", text: "Duplicate charges, charges after cancellation, or charges caused by a Codexa error are refunded in full." }] },
      { id: "how", heading: "How to request", blocks: [{ type: "paragraph", text: `Email [${sup}](mailto:${sup}) from the account's email with the workspace name and invoice. Refunds are issued to the original payment method through Stripe or Razorpay and typically appear within 5 to 10 business days.` }] },
      { id: "law", heading: "Your statutory rights", blocks: [{ type: "note", variant: "warning", title: "Pending legal review", text: "Consumer protection law in India and elsewhere may give you rights beyond this policy. This page does not limit them. Final wording requires legal review." }] },
    ],
  },
  "/contact-sales": {
    path: "/contact-sales",
    eyebrow: "Pricing",
    title: "Contact sales",
    intro: "Talk to us about Team and Enterprise plans, custom limits, invoice billing, or a security review. We reply by email, usually within two business days.",
    sections: [
      { id: "what-to-include", heading: "Helpful to include", blocks: [{ type: "list", items: ["Team size and how many will build versus view.", "Expected AI usage, runtime, and deployments per month.", "Whether you need INR or USD invoicing.", "Any security or data processing requirements."] }] },
    ],
  },
  "/request-demo": {
    path: "/request-demo",
    eyebrow: "Pricing",
    title: "Request a demo",
    intro: "A short walkthrough of generating, editing, running, and deploying a project, tailored to what you want to build. We will email you to find a time.",
    sections: [
      { id: "self-serve", heading: "Prefer to try it yourself?", blocks: [{ type: "paragraph", text: "The Free plan needs no card and the [quickstart](/docs/quickstart) takes about five minutes. Interface previews on the [product page](/product) show what the workspace looks like." }] },
    ],
  },
};

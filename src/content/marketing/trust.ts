import type { ContentPage } from "./types";
import { site } from "@/config/site";

const UPDATED = "2026-10-24";
const sec = site.company.securityEmail;
const priv = site.company.privacyEmail;

/**
 * Who runs the service. Until the configured legal name is a registered entity (not just the
 * product name), say so plainly instead of the circular "Codexa is operated by Codexa".
 */
const OPERATOR =
  site.company.legalName.trim().toLowerCase() === site.name.trim().toLowerCase()
    ? "Codexa is run by its founding team in India. The legal entity that acts as data controller, and its registered address, will be named here once legal review is complete."
    : `Codexa is operated by ${site.company.legalName}.`;
const sup = site.company.supportEmail;

export const TRUST_PAGES: Record<string, ContentPage> = {
  "/security": {
    path: "/security",
    eyebrow: "Security",
    variant: "landing",
    tone: "trust",
    headline: "Security you can read.",
    mark: "you can read.",
    title: "Security at Codexa",
    intro: "How the platform isolates generated code, protects secrets, and handles accounts. This page describes what is implemented in the codebase today; it is not a certification and we do not hold any third-party attestations yet.",
    review: "security",
    updated: UPDATED,
    sections: [
      {
        id: "request-path",
        heading: "The request path",
        navLabel: "Request path",
        blocks: [{ type: "diagram", name: "request-path" }],
      },
      {
        id: "summary",
        heading: "Summary",
        blocks: [
          { type: "list", items: ["Generated and user code never runs inside the web application process.", "Secrets (environment variables, integration credentials) are encrypted at rest and never returned to the browser.", "Sessions use httpOnly cookies; session tokens are hashed at rest.", "Public and sensitive endpoints are rate limited.", "Security-relevant actions are written to an audit log."] },
        ],
      },
      {
        id: "sandboxing",
        heading: "Sandboxing and runtime isolation",
        blocks: [
          { type: "paragraph", text: "Projects run in a separate runner service, never inside the web application. On Cloudflare, each project gets its own ProjectSandbox Durable Object, which starts that project's own Container on demand and stops it after 30 minutes without requests; inside it, the runner executes commands as an unprivileged user. Self-hosted runners use the namespace driver instead: an unprivileged Linux user in its own user, PID and mount namespaces, with cgroup memory and process limits and a wall-clock timeout." },
          { type: "paragraph", text: "Only allowlisted commands (install, build, test, type-check, start) can be executed; there is no arbitrary shell endpoint. Operators can choose Docker or E2B drivers. Previews are served through a host-based proxy on a separate origin, so a running project is never on the same origin as the Codexa application." },
        ],
      },
      {
        id: "secrets",
        heading: "Secrets and encryption",
        blocks: [
          { type: "paragraph", text: "Project environment variables and workspace integration credentials are encrypted with an operator-held key before storage, by `encryptSecret`, and decrypted only on the server when injected into a sandbox or used to call a provider. The UI shows masked values and the API never returns plaintext secrets." },
          { type: "paragraph", text: "Transport encryption (TLS) is the responsibility of the operator's deployment; the application sets secure cookie attributes when served over HTTPS." },
        ],
      },
      {
        id: "accounts",
        heading: "Accounts and sessions",
        blocks: [
          { type: "list", items: ["Passwords are hashed with a modern password hashing function; plaintext passwords are never stored or logged.", "Email verification and password reset use single-use, expiring tokens.", "Sessions are httpOnly, SameSite cookies named `__Host-codexa_session` (the `__Host-` prefix stops other subdomains from setting it); the stored session token is a hash, so a database read alone cannot be used to hijack a session.", "GitHub sign-in is available only when the operator configures OAuth; the OAuth state is checked on callback.", "Workspace roles (owner, admin, editor, viewer) are enforced on the server for every API route."] },
        ],
      },
      {
        id: "rate-limiting",
        heading: "Rate limiting and abuse controls",
        blocks: [
          { type: "paragraph", text: "Login, signup, password reset, AI generation, and public forms are rate limited per IP or per workspace using a fixed-window limiter stored in the database (Cloudflare D1), shared by every Worker instance. Usage limits (AI requests and tokens, runtime minutes, deployments, storage) are enforced server-side per workspace. Abuse reports can be filed through [support](/support) and are handled in the staff admin area." },
        ],
      },
      {
        id: "audit",
        heading: "Audit logs",
        blocks: [
          { type: "paragraph", text: "Sign-ins, role changes, invitations, integration changes, deployments, and administrative actions are recorded with the acting user, workspace, and timestamp. Enterprise customers can request an export." },
        ],
      },
      {
        id: "disclosure",
        heading: "Responsible disclosure",
        blocks: [
          { type: "paragraph", text: `If you find a vulnerability, please report it through the [vulnerability reporting form](/vulnerability-reporting) or email [${sec}](mailto:${sec}). We do not run a paid bounty programme at this time. See the [responsible disclosure policy](/responsible-disclosure) for scope and what to expect.` },
        ],
      },
      {
        id: "shared-responsibility",
        heading: "Shared responsibility",
        blocks: [
          { type: "paragraph", text: "Codexa secures the platform. You are responsible for the code you deploy, the data you put into it, the secrets you add, and for assessing whether a deployment meets your regulatory obligations. We make no compliance claims on your behalf." },
        ],
      },
    ],
    cta: { title: "Questions about security?", description: "We answer security questionnaires for Team and Enterprise customers.", primary: { label: "Contact sales", href: "/contact-sales" }, secondary: { label: "Report a vulnerability", href: "/vulnerability-reporting" } },
  },

  "/trust": {
    path: "/trust",
    eyebrow: "Trust",
    title: "Our commitments",
    intro: "What you can expect from Codexa on security, privacy, reliability, and honesty. Short, specific, and limited to what we actually do.",
    review: "legal",
    updated: UPDATED,
    sections: [
      { id: "security", heading: "Security", blocks: [{ type: "paragraph", text: "Generated code runs in isolated sandboxes, secrets are encrypted at rest, and sessions and roles are enforced on the server. Details on the [security page](/security). We have no third-party certifications yet and say so wherever it matters." }] },
      { id: "privacy", heading: "Privacy", blocks: [{ type: "paragraph", text: "We collect what the product needs to work and describe it in the [privacy policy](/privacy). Prompts and project files are sent to an AI provider only when your operator has configured one and only when you start a run; see the [AI policy](/ai-policy)." }] },
      { id: "reliability", heading: "Reliability", blocks: [{ type: "paragraph", text: "Live component status is on the [status page](/status). We do not publish uptime percentages because we do not yet have a long enough measured history to make them meaningful." }] },
      { id: "honesty", heading: "Honesty", blocks: [{ type: "paragraph", text: "Every feature described on this site is implemented. Where a capability depends on operator configuration (AI keys, GitHub OAuth, payment providers, Vercel, email) the product shows an explicit \"not configured\" state rather than pretending to work. Roadmap items are labelled as such." }] },
      { id: "contact", heading: "Contact", blocks: [{ type: "definitions", items: [{ term: "Security", detail: `[${sec}](mailto:${sec})` }, { term: "Privacy", detail: `[${priv}](mailto:${priv})` }, { term: "Support", detail: `[${sup}](mailto:${sup})` }] }] },
    ],
    cta: { title: "Browse the trust center.", primary: { label: "Trust center", href: "/trust-center" }, secondary: { label: "Security", href: "/security" } },
  },

  "/trust-center": {
    path: "/trust-center",
    eyebrow: "Trust center",
    variant: "landing",
    tone: "trust",
    headline: "Every policy, in one place.",
    mark: "in one place.",
    visual: "env-vars",
    title: "Trust center",
    intro: "Every policy and practice document in one place, with the people to contact when you have a question.",
    updated: UPDATED,
    sections: [
      {
        id: "policies",
        heading: "Policies",
        blocks: [
          { type: "links", items: [
            { label: "Privacy policy", href: "/privacy", description: "What we collect and why." },
            { label: "Terms of service", href: "/terms", description: "The agreement for using Codexa." },
            { label: "Acceptable use", href: "/acceptable-use", description: "What you may build and run." },
            { label: "Cookie policy", href: "/cookie-policy", description: "The cookies the application sets." },
            { label: "Data processing", href: "/data-processing", description: "Processing terms for customers." },
            { label: "Subprocessors", href: "/subprocessors", description: "Third parties that may process data, only when configured." },
            { label: "Data retention", href: "/data-retention", description: "How long each kind of data is kept." },
            { label: "AI policy", href: "/ai-policy", description: "How prompts and files reach AI providers." },
            { label: "Refund policy", href: "/refund-policy", description: "When refunds are issued." },
          ] },
        ],
      },
      {
        id: "practices",
        heading: "Practices",
        blocks: [
          { type: "links", items: [
            { label: "Security", href: "/security", description: "Sandboxing, encryption, sessions, rate limits, audit logs." },
            { label: "Responsible disclosure", href: "/responsible-disclosure", description: "Scope and process for reporting vulnerabilities." },
            { label: "Vulnerability reporting", href: "/vulnerability-reporting", description: "The form to file a report." },
            { label: "Accessibility", href: "/accessibility", description: "Commitments and known gaps." },
            { label: "Status", href: "/status", description: "Live component status." },
          ] },
        ],
      },
      {
        id: "certifications",
        heading: "Certifications and audits",
        blocks: [{ type: "note", variant: "warning", title: "None yet", text: "Codexa does not hold SOC 2, ISO 27001, HIPAA, PCI DSS, or GDPR certifications and has not completed a third-party penetration test. We will update this page when that changes. Enterprise customers can request our security questionnaire responses." }],
      },
      {
        id: "contacts",
        heading: "Contacts",
        blocks: [{ type: "definitions", items: [{ term: "Security", detail: `[${sec}](mailto:${sec})` }, { term: "Privacy", detail: `[${priv}](mailto:${priv})` }, { term: "Support", detail: `[${sup}](mailto:${sup})` }, { term: "Sales", detail: `[${site.company.salesEmail}](mailto:${site.company.salesEmail})` }] }],
      },
    ],
  },

  "/privacy": {
    path: "/privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    intro: "This policy explains what personal data Codexa collects, why, and how you can exercise your rights. It is written to match how the software actually works.",
    review: "legal",
    updated: UPDATED,
    sections: [
      { id: "who", heading: "Who we are", blocks: [{ type: "paragraph", text: `${OPERATOR} For privacy questions contact [${priv}](mailto:${priv}).` }] },
      {
        id: "data",
        heading: "Data we collect",
        blocks: [
          { type: "table", caption: "Categories of personal data", columns: ["Category", "Examples", "Why"], rows: [
            ["Account", "Email address, name, hashed password, email verification status, GitHub account id (if you sign in with GitHub)", "To create and secure your account"],
            ["Workspace and billing", "Workspace names, member roles, plan, subscription identifiers from Stripe or Razorpay, invoice records", "To provide the service and bill for it"],
            ["Projects", "Project files, snapshots, activity history, environment variables (encrypted), deployment records, logs", "To provide the product"],
            ["AI usage", "Prompts, conversation messages, agent runs, token counts", "To run the agent and enforce plan limits"],
            ["Technical", "IP address, user agent, timestamps, rate-limit counters, audit log entries", "Security, abuse prevention, debugging"],
            ["Support", "Messages you send through forms, your email, the page you were on", "To answer you"],
          ] },
        ],
      },
      { id: "ai", heading: "AI providers", blocks: [{ type: "paragraph", text: "When you start an AI run, the prompt and the project files the agent reads are sent to the AI provider configured by your operator (Anthropic or OpenAI). We do not send data to AI providers at any other time. See the [AI policy](/ai-policy)." }] },
      { id: "sharing", heading: "Who we share data with", blocks: [{ type: "paragraph", text: "Only the providers listed on the [subprocessors page](/subprocessors), and each only when your operator has configured that integration. We do not sell personal data." }] },
      { id: "cookies", heading: "Cookies", blocks: [{ type: "paragraph", text: "We use a small number of first-party cookies for sessions, theme, and workspace selection. There are no advertising or third-party analytics cookies. See the [cookie policy](/cookie-policy)." }] },
      { id: "retention", heading: "Retention", blocks: [{ type: "paragraph", text: "See the [data retention page](/data-retention) for how long each category is kept and what happens when you delete a project or account." }] },
      { id: "rights", heading: "Your rights", blocks: [{ type: "paragraph", text: `Depending on where you live you may have the right to access, correct, export, or delete your personal data, or to object to certain processing. You can delete projects and your account from settings; for anything else email [${priv}](mailto:${priv}) and we will respond within 30 days.` }] },
      { id: "children", heading: "Children", blocks: [{ type: "paragraph", text: "Codexa is not directed at children under 13 (or the higher age required in your jurisdiction) and we do not knowingly collect their data." }] },
      { id: "changes", heading: "Changes", blocks: [{ type: "paragraph", text: "We will post changes to this page and update the revision date. Material changes will be announced to account holders by email." }] },
    ],
  },

  "/terms": {
    path: "/terms",
    eyebrow: "Legal",
    title: "Terms of service",
    intro: "The agreement between you and Codexa for using the platform. A working draft written by the product team, pending legal review.",
    review: "legal",
    updated: UPDATED,
    sections: [
      { id: "account", heading: "1. Your account", blocks: [{ type: "paragraph", text: "You must provide accurate information, keep your credentials secure, and be at least 13 years old (or the age of digital consent where you live). You are responsible for activity under your account and for the members you invite to your workspaces." }] },
      { id: "service", heading: "2. The service", blocks: [{ type: "paragraph", text: "Codexa provides tools to generate, edit, run, and deploy software. Some capabilities depend on configuration by the operator of the instance (for example AI provider keys, GitHub OAuth, payment providers). We may change or discontinue features; roadmap items are not commitments." }] },
      { id: "your-content", heading: "3. Your content and code", blocks: [{ type: "paragraph", text: "You own the projects, prompts, and files you create. You grant us the limited licence needed to store, run, build, deploy, and display them to you and to those you share them with. Generated code is provided as-is; you are responsible for reviewing it before use." }] },
      { id: "acceptable-use", heading: "4. Acceptable use", blocks: [{ type: "paragraph", text: "You must follow the [acceptable use policy](/acceptable-use). We may suspend projects or accounts that violate it, abuse the sandbox, or threaten the service." }] },
      { id: "billing", heading: "5. Plans and billing", blocks: [{ type: "paragraph", text: "Paid plans renew monthly or annually until cancelled. Prices are shown in INR and USD excluding taxes. Usage limits are enforced per workspace. Refunds are handled under the [refund policy](/refund-policy). See [pricing](/pricing) and the [billing FAQ](/billing-faq)." }] },
      { id: "third-parties", heading: "6. Third-party services", blocks: [{ type: "paragraph", text: "Integrations with GitHub, AI providers, payment providers, Vercel, email, and databases are subject to those providers' terms. We are not responsible for their availability or conduct." }] },
      { id: "termination", heading: "7. Termination", blocks: [{ type: "paragraph", text: "You can delete your account at any time. We may terminate accounts for breach of these terms. On termination your data is handled per the [data retention page](/data-retention)." }] },
      { id: "warranty", heading: "8. Disclaimer and limitation of liability", blocks: [{ type: "paragraph", text: "The service is provided \"as is\" without warranties of any kind to the extent permitted by law. Our aggregate liability is limited to the amount you paid us in the twelve months before the claim. Some jurisdictions do not allow these limits, in which case they apply to the maximum extent permitted." }] },
      { id: "law", heading: "9. Governing law", blocks: [{ type: "note", variant: "warning", title: "Pending legal review", text: "Governing law, venue, and dispute resolution clauses will be added after legal review. Until then, this page is a draft and not a binding agreement." }] },
      { id: "contact", heading: "10. Contact", blocks: [{ type: "paragraph", text: `Questions about these terms: [${sup}](mailto:${sup}).` }] },
    ],
  },

  "/acceptable-use": {
    path: "/acceptable-use",
    eyebrow: "Legal",
    title: "Acceptable use policy",
    intro: "What you may and may not build, run, or deploy on Codexa. The sandbox is shared infrastructure; these rules keep it safe for everyone.",
    review: "legal",
    updated: UPDATED,
    sections: [
      { id: "prohibited", heading: "Prohibited uses", blocks: [{ type: "list", items: ["Malware, credential harvesting, phishing pages, or anything designed to deceive users or compromise devices.", "Attacks on Codexa, other tenants, or third parties: scanning, denial of service, sandbox escape attempts, resource exhaustion, or probing the runner or preview proxy.", "Cryptocurrency mining or other compute abuse unrelated to developing your application.", "Content that is illegal where you or we operate, including child sexual abuse material, incitement to violence, or infringement of others' intellectual property.", "Scraping or collecting personal data without a lawful basis.", "Reselling the service or sharing one account between many people outside a team workspace.", "Using AI features to generate content that violates the configured provider's usage policies."] }] },
      { id: "sandbox", heading: "Sandbox limits", blocks: [{ type: "paragraph", text: "Each runtime has memory, process, and time limits set by your plan and the operator. Repeatedly hitting those limits, or trying to circumvent them, may result in suspension. Outbound network access from sandboxes may be restricted by the operator." }] },
      { id: "enforcement", heading: "Enforcement", blocks: [{ type: "paragraph", text: `We may stop a runtime, take down a deployment, or suspend an account to protect the service, and will tell you why unless legally prevented. To report abuse of a Codexa deployment, use the [support form](/support) or email [${sup}](mailto:${sup}).` }] },
      { id: "security-research", heading: "Security research", blocks: [{ type: "paragraph", text: "Good-faith research within the scope of the [responsible disclosure policy](/responsible-disclosure) is not a violation of this policy." }] },
    ],
  },

  "/cookie-policy": {
    path: "/cookie-policy",
    eyebrow: "Legal",
    title: "Cookie policy",
    intro: "Codexa sets a small number of first-party cookies that the application needs to function. There are no advertising cookies and no third-party analytics scripts.",
    review: "legal",
    updated: UPDATED,
    sections: [
      {
        id: "cookies",
        heading: "Cookies we set",
        blocks: [
          { type: "table", caption: "Cookies set by the Codexa application", columns: ["Cookie", "Purpose", "Type", "Lifetime"], rows: [
            ["`__Host-codexa_session`", "Identifies your signed-in session. httpOnly, SameSite, Secure over HTTPS. The stored value is a hash of the token.", "Strictly necessary", "Until you sign out or the session expires"],
            ["`codexa_theme`", "Remembers your light, dark, or system theme choice.", "Preference", "1 year"],
            ["`codexa_workspace`", "Remembers which workspace you last opened.", "Preference", "1 year"],
            ["GitHub OAuth state", "A short-lived, httpOnly cookie that protects the GitHub sign-in callback against cross-site request forgery. Only set during sign-in when GitHub OAuth is configured.", "Strictly necessary", "A few minutes"],
          ] },
        ],
      },
      { id: "third-party", heading: "Third-party cookies", blocks: [{ type: "paragraph", text: "When you check out with Stripe or Razorpay, their hosted pages may set their own cookies under their policies. Codexa does not embed advertising, tracking pixels, or third-party analytics." }] },
      { id: "control", heading: "Managing cookies", blocks: [{ type: "paragraph", text: "You can clear or block cookies in your browser. Blocking `__Host-codexa_session` will sign you out; blocking the preference cookies only resets your theme and workspace selection." }] },
    ],
  },

  "/data-processing": {
    path: "/data-processing",
    eyebrow: "Legal",
    title: "Data processing terms",
    intro: "How Codexa processes personal data on behalf of customers who use the platform in their own products. A draft pending legal review; not a signed DPA.",
    review: "legal",
    updated: UPDATED,
    sections: [
      { id: "roles", heading: "Roles", blocks: [{ type: "paragraph", text: "For account and billing data, Codexa is a controller. For data you store in projects, databases you connect, and applications you deploy, you are the controller and Codexa is a processor acting on your instructions through the product." }] },
      { id: "instructions", heading: "Processing on instructions", blocks: [{ type: "paragraph", text: "We process customer data only to provide the service: storing files, running sandboxes, building and serving deployments, and forwarding prompts to the AI provider you or your operator configured. We do not use your project data to train models." }] },
      { id: "subprocessors", heading: "Subprocessors", blocks: [{ type: "paragraph", text: "The current list, with the condition under which each is used, is on the [subprocessors page](/subprocessors). We will update that page before adding a subprocessor." }] },
      { id: "security", heading: "Security measures", blocks: [{ type: "paragraph", text: "Described on the [security page](/security): sandbox isolation, encryption of secrets at rest, hashed session tokens, server-side authorization, rate limiting, and audit logs." }] },
      { id: "transfers", heading: "International transfers", blocks: [{ type: "note", variant: "warning", title: "Operator-specific", text: "Where data is hosted depends on the operator's PostgreSQL hosting and the configured providers. Transfer mechanisms (for example standard contractual clauses) require legal review before being offered." }] },
      { id: "deletion", heading: "Deletion and return", blocks: [{ type: "paragraph", text: "You can export projects to GitHub and delete projects, workspaces, and your account from the product. Retention after deletion is described on the [data retention page](/data-retention)." }] },
      { id: "signed", heading: "Requesting a signed DPA", blocks: [{ type: "paragraph", text: `Team and Enterprise customers can request a signed agreement through [contact sales](/contact-sales) or [${priv}](mailto:${priv}).` }] },
    ],
  },

  "/subprocessors": {
    path: "/subprocessors",
    eyebrow: "Legal",
    title: "Subprocessors",
    intro: "Third parties that may process customer data on Codexa's behalf. Each is used only when the operator of your Codexa instance has configured it; none is contacted otherwise.",
    review: "legal",
    updated: UPDATED,
    sections: [
      {
        id: "list",
        heading: "Current list",
        blocks: [
          { type: "table", caption: "Subprocessors and the condition under which they are used", columns: ["Provider", "Purpose", "Data", "Used when"], rows: [
            ["PostgreSQL hosting (operator-defined)", "Primary database", "All application data", "Always; the operator chooses the host"],
            ["Anthropic", "AI model provider", "Prompts, conversation messages, project files the agent reads", "Only when an Anthropic key is configured and you start a run"],
            ["OpenAI", "AI model provider", "Prompts, conversation messages, project files the agent reads", "Only when an OpenAI key is configured and you start a run"],
            ["Resend", "Transactional email", "Email address, email content (verification, reset, invitations)", "Only when a Resend key is configured; otherwise mail is queued in an outbox"],
            ["Stripe", "Payments (international)", "Email, billing details you enter on Stripe's pages, subscription identifiers", "Only when Stripe is configured and you check out in USD"],
            ["Razorpay", "Payments (India)", "Email, billing details you enter on Razorpay's pages, subscription identifiers", "Only when Razorpay is configured and you check out in INR"],
            ["Vercel", "Deployment target", "Project build output, environment variables you choose to deploy", "Only when a Vercel token is configured and you deploy to Vercel"],
            ["GitHub", "Sign-in, import, push", "GitHub account id, repository contents you import or push", "Only when GitHub OAuth is configured and you connect your account"],
            ["E2B", "Sandbox driver", "Project files and commands executed in the sandbox", "Only when the operator selects the E2B driver"],
          ] },
          { type: "note", variant: "info", text: "Codexa does not use third-party analytics, advertising, session replay, or error-tracking services." },
        ],
      },
      { id: "changes", heading: "Changes to this list", blocks: [{ type: "paragraph", text: "We update this page before a new subprocessor handles customer data. Team and Enterprise customers can ask to be notified by email." }] },
    ],
  },

  "/responsible-disclosure": {
    path: "/responsible-disclosure",
    eyebrow: "Security",
    title: "Responsible disclosure policy",
    intro: "We welcome reports from security researchers. This page sets out what is in scope, how to report, and what you can expect from us.",
    review: "security",
    updated: UPDATED,
    sections: [
      { id: "scope", heading: "Scope", blocks: [{ type: "list", items: ["The Codexa web application and HTTP API.", "The runner service, sandbox isolation, and the preview and hosting proxies.", "The realtime (WebSocket) service.", "Out of scope: third-party providers (GitHub, Anthropic, OpenAI, Stripe, Razorpay, Resend, Vercel, E2B), applications deployed by Codexa users, social engineering, and physical attacks."] }] },
      { id: "rules", heading: "Rules of engagement", blocks: [{ type: "list", items: ["Test only against accounts and projects you own.", "Do not access, modify, or delete other users' data; if you encounter it, stop and report.", "No denial of service, resource exhaustion, or automated scanning that degrades the service.", "Give us a reasonable time to fix the issue before public disclosure; we aim for 90 days."] }] },
      { id: "report", heading: "How to report", blocks: [{ type: "paragraph", text: `Use the [vulnerability reporting form](/vulnerability-reporting) or email [${sec}](mailto:${sec}). Include steps to reproduce, affected URLs or components, and the impact you believe is possible. Please do not include other people's data in the report.` }] },
      { id: "expect", heading: "What to expect", blocks: [{ type: "list", items: ["Acknowledgement within 5 business days.", "An assessment of severity and a fix timeline where the report is valid.", "Credit on this page if you wish, once the issue is fixed.", "We do not run a paid bug bounty at this time and cannot offer monetary rewards."] }] },
      { id: "safe-harbor", heading: "Safe harbour", blocks: [{ type: "note", variant: "warning", title: "Pending legal review", text: "We intend to treat good-faith research that follows this policy as authorised and not to pursue legal action for it. The precise wording of this commitment requires legal review." }] },
    ],
  },

  "/accessibility": {
    path: "/accessibility",
    eyebrow: "Trust",
    title: "Accessibility",
    intro: "Our aim is for Codexa to be usable by everyone, including people who rely on keyboards, screen readers, or high contrast. This page lists the commitments we build to and the gaps we know about.",
    updated: UPDATED,
    sections: [
      { id: "commitments", heading: "What we build to", blocks: [{ type: "list", items: ["Semantic HTML with one `h1` per page and a logical heading order.", "Every form control has a visible label; errors are announced and linked to the field.", "Keyboard operability: menus, dialogs, accordions, and the mobile navigation can be opened, used, and closed with Tab, Enter, Space, Arrow keys, and Escape.", "Visible focus indicators and a skip-to-content link on every page.", "Colour is never the only carrier of meaning; status dots and badges include text.", "Light and dark themes with contrast targeting WCAG 2.2 AA for body text.", "Layouts that work down to 360px wide without horizontal scrolling.", "Reduced-motion preferences are respected for animations."] }] },
      { id: "gaps", heading: "Known gaps", blocks: [{ type: "list", items: ["The Monaco code editor has its own accessibility model; some features (for example diff navigation) are harder with a screen reader than in a desktop editor.", "The live preview iframe shows your application; its accessibility depends on the code in your project.", "The file explorer tree does not yet implement full type-ahead navigation.", "We have not yet commissioned a third-party accessibility audit.", "Not all interface previews on marketing pages have long descriptions."] }] },
      { id: "feedback", heading: "Tell us about a problem", blocks: [{ type: "paragraph", text: `If something is hard or impossible to use, please [report it](/report-bug) with the page and the assistive technology you were using, or email [${sup}](mailto:${sup}). Accessibility reports are treated as bugs, not feature requests.` }] },
    ],
  },

  "/data-retention": {
    path: "/data-retention",
    eyebrow: "Legal",
    title: "Data retention",
    intro: "How long Codexa keeps each kind of data and what deletion does. Draft pending legal review.",
    review: "legal",
    updated: UPDATED,
    sections: [
      {
        id: "schedule",
        heading: "Retention schedule",
        blocks: [
          { type: "table", caption: "Retention by data category", columns: ["Data", "Kept while", "After deletion"], rows: [
            ["Account (email, name, password hash)", "Your account exists", "Removed within 30 days of account deletion; audit entries keep a pseudonymous id"],
            ["Sessions", "Until sign-out or expiry", "Removed on expiry"],
            ["Projects, files, snapshots", "The project exists", "Removed within 30 days of project deletion"],
            ["Environment variables and integration secrets", "The project or connection exists", "Removed with the project or connection"],
            ["AI conversations and runs", "The project exists", "Removed with the project"],
            ["Deployment records and build logs", "The project exists", "Removed with the project; published builds are taken down at deletion"],
            ["Usage events", "Current and previous 12 billing periods", "Aggregated for billing records"],
            ["Invoices and subscription records", "7 years or as required by tax law", "Retained as required"],
            ["Audit logs", "12 months", "Removed after 12 months unless needed for an investigation"],
            ["Support tickets", "24 months after closure", "Removed"],
            ["Newsletter subscription", "Until you unsubscribe", "Email retained on a suppression list to honour the unsubscribe"],
            ["Rate-limit counters and runner logs", "Hours to days", "Rolled over automatically"],
          ] },
        ],
      },
      { id: "backups", heading: "Backups", blocks: [{ type: "paragraph", text: "Database backups are managed by the operator's PostgreSQL hosting. Deleted data may persist in backups for the backup retention window before it is overwritten." }] },
      { id: "requests", heading: "Requests", blocks: [{ type: "paragraph", text: `To request deletion or export beyond what the product offers, email [${priv}](mailto:${priv}).` }] },
    ],
  },

  "/ai-policy": {
    path: "/ai-policy",
    eyebrow: "Trust",
    title: "AI policy",
    intro: "How Codexa uses AI providers, what data reaches them, and what we do and do not do with your prompts and code.",
    review: "legal",
    updated: UPDATED,
    sections: [
      { id: "providers", heading: "Which providers", blocks: [{ type: "paragraph", text: "Codexa has a provider abstraction for Anthropic and OpenAI models. The operator of your instance decides which keys are configured and which model is the default. If no key is configured, AI features are disabled and the interface says so; nothing is sent anywhere." }] },
      { id: "what-is-sent", heading: "What is sent", blocks: [{ type: "list", items: ["Your prompt and the conversation history for the current project conversation.", "The project files the agent chooses to read, and the listing of file paths.", "Build, test, and type-check output when the agent validates its changes.", "Not sent: your password, session, environment variable values, integration secrets, or files from other projects."] }] },
      { id: "training", heading: "Training", blocks: [{ type: "paragraph", text: "Codexa does not train models on your data. Whether a provider retains or uses data sent through its API is governed by that provider's terms for API usage and by the operator's agreement with them." }] },
      { id: "control", heading: "Control and review", blocks: [{ type: "list", items: ["A snapshot is taken before every run; you can review per-file diffs and revert.", "Runs stream their plan and tool calls; you can cancel at any time.", "Repairs are bounded to two attempts so the agent cannot loop indefinitely.", "Usage (requests and tokens) is recorded per workspace and enforced against your plan; see [credits](/credits)."] }] },
      { id: "responsibility", heading: "Your responsibility", blocks: [{ type: "paragraph", text: "Generated code can be wrong, insecure, or infringe on others' work. Review it as you would any contribution before deploying it to users. Follow the configured provider's usage policies and the [acceptable use policy](/acceptable-use)." }] },
    ],
  },
  "/vulnerability-reporting": {
    path: "/vulnerability-reporting",
    eyebrow: "Security",
    title: "Report a security vulnerability",
    intro: "Use this form to report a vulnerability in Codexa. Reports go to the security queue, not general support. Please read the responsible disclosure policy first.",
    sections: [
      { id: "policy", heading: "Before you submit", blocks: [{ type: "list", items: ["Read the [responsible disclosure policy](/responsible-disclosure) for scope and rules.", "Do not include other users' personal data in the report.", "If the issue involves a third-party provider, report it to them directly.", `You can also email [${sec}](mailto:${sec}). We acknowledge reports within 5 business days.`] }] },
    ],
  },
};

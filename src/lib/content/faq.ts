/** FAQ entries grouped by topic. Pure data; keep every answer factual. */
export type FaqItem = { q: string; a: string; href?: string };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "product",
    title: "Product",
    items: [
      { q: "What does Codexa do?", a: "Codexa turns a prompt into a working project, then lets you edit the real code in a Monaco-based editor, run it in an isolated sandbox with a live preview, and deploy it. The AI agent plans, edits files, runs checks and repairs errors, and every run is snapshotted so it can be reviewed and reverted.", href: "/docs/getting-started" },
      { q: "Which project types are supported?", a: "React + Vite + TypeScript + Tailwind single-page apps, static HTML/CSS/JS sites and Node + Express REST APIs. A Next.js full-stack template is on the roadmap and is not available yet.", href: "/docs/projects" },
      { q: "Do I own the code?", a: "Yes. Everything in a project is ordinary source code stored in your workspace. You can download it, push it to GitHub or copy it out at any time.", href: "/docs/github" },
      { q: "Can two people edit the same file at once?", a: "Not yet. Codexa shows realtime presence (who is viewing which file), but concurrent editing with conflict resolution is on the roadmap. Last save wins today, so coordinate on shared files.", href: "/roadmap" },
      { q: "Is there a mobile app?", a: "No. Codexa is a web application; native mobile apps are a later roadmap item.", href: "/roadmap" },
    ],
  },
  {
    id: "ai",
    title: "AI agent",
    items: [
      { q: "Which models does the agent use?", a: "Codexa has a provider abstraction for Anthropic and OpenAI models. The operator of your Codexa instance configures the API key and default model; workspace-level provider connections are also supported. When no key is configured the UI shows an explicit 'AI not configured' state.", href: "/docs/ai-agent" },
      { q: "What happens if the AI breaks my project?", a: "A snapshot is taken before every run. You can review the diff the run produced and revert to the pre-run snapshot in one click.", href: "/docs/ai-agent" },
      { q: "Does the agent run my code?", a: "Only inside the sandbox through the runner service, and only allowlisted commands: install, build, test, typecheck and lint. It never runs code in the web server process.", href: "/docs/security" },
      { q: "How many repair attempts does it make?", a: "At most two. If validation still fails after that, the run reports the remaining error and stops so you stay in control.", href: "/docs/ai-agent" },
      { q: "Why did I get 'quota_exceeded'?", a: "Your workspace reached a plan limit for the current period (AI requests, tokens, runtime minutes, deployments, storage, projects or members). Check Usage in your workspace or upgrade the plan.", href: "/docs/troubleshooting" },
    ],
  },
  {
    id: "runtime",
    title: "Previews and deployment",
    items: [
      { q: "How are previews isolated?", a: "Each preview runs in a sandbox as an unprivileged user inside Linux namespaces with cgroup memory and process limits and timeouts. Docker and E2B drivers are also available to operators.", href: "/docs/security" },
      { q: "Where are projects deployed?", a: "Codexa static hosting works out of the box: the project is built in a sandbox and served at a Codexa subdomain with deployment history and rollback. A Vercel adapter exists but requires a Vercel token.", href: "/docs/deployment" },
      { q: "Can I use my own domain?", a: "Yes, by adding a CNAME record that points at your deployment. Automated domain verification is planned; until then follow the manual instructions in the docs.", href: "/docs/custom-domains" },
      { q: "Why does the preview say the runner is unavailable?", a: "The runner service is a separate process. If it is not running or cannot be reached by the web app, previews, builds and deployments are disabled and the UI says so.", href: "/docs/troubleshooting" },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    items: [
      { q: "Which plans exist?", a: "Free, Pro, Team and Enterprise, priced in INR and USD with monthly and annual intervals. Limits are listed on the pricing page and enforced per workspace on the server.", href: "/pricing" },
      { q: "Which payment methods are supported?", a: "Stripe for international payments and Razorpay for India. Both require the operator to configure keys; when neither is configured, checkout shows a 'not configured' state instead of failing silently.", href: "/docs/billing" },
      { q: "What happens when I cancel?", a: "Your subscription stays active until the end of the current period, then the workspace returns to the Free plan limits. Projects are not deleted.", href: "/docs/billing" },
      { q: "How are AI requests counted?", a: "Each generation run counts as one AI request, and the provider's reported input and output tokens count against the token limit. Both reset at the start of each calendar month (UTC).", href: "/credits" },
    ],
  },
  {
    id: "account",
    title: "Account and security",
    items: [
      { q: "How do I sign in?", a: "With email and password (after verifying your email) or with GitHub when the operator has configured GitHub OAuth.", href: "/help/account" },
      { q: "How are secrets stored?", a: "Environment variables and integration secrets are encrypted with the platform encryption key before they are written to the database and are never returned to the browser in clear text unless an editor explicitly reveals a project variable.", href: "/docs/environment-variables" },
      { q: "Is Codexa SOC 2 or ISO 27001 certified?", a: "No. Codexa is an early-stage product and has not completed any third-party certification or audit. The security page describes the controls that are actually in place.", href: "/security" },
      { q: "How do I delete my data?", a: "Delete projects from their settings page and contact privacy@codexa.app to delete your account. See the data export and deletion help article for details.", href: "/help/data-export-and-deletion" },
      { q: "How do I report a vulnerability?", a: "Email security@codexa.app or use the responsible disclosure form.", href: "/responsible-disclosure" },
    ],
  },
];

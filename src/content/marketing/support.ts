import type { ContentPage } from "./types";
import { site } from "@/config/site";

const sup = site.company.supportEmail;

export const SUPPORT_PAGES: Record<string, ContentPage> = {
  "/support": {
    path: "/support",
    eyebrow: "Support",
    title: "Support",
    intro: "Start with the resources below; most questions are answered there. If not, send us a message and we will reply by email.",
    sections: [
      { id: "self-serve", heading: "Find it yourself", blocks: [{ type: "links", items: [{ label: "Documentation", href: "/docs", description: "Guides and reference for every feature." }, { label: "Help center", href: "/help", description: "Short answers to common questions." }, { label: "Troubleshooting", href: "/docs/troubleshooting", description: "Common errors and fixes." }, { label: "Status", href: "/status", description: "Is something down right now?" }, { label: "Billing FAQ", href: "/billing-faq", description: "Invoices, taxes, payments." }, { label: "System requirements", href: "/system-requirements", description: "Browsers and devices." }] }] },
      { id: "other-forms", heading: "Specific forms", blocks: [{ type: "links", items: [{ label: "Report a bug", href: "/report-bug" }, { label: "Request a feature", href: "/request-feature" }, { label: "Feedback", href: "/feedback" }, { label: "Report a security issue", href: "/vulnerability-reporting" }] }] },
      { id: "response", heading: "Response times", blocks: [{ type: "paragraph", text: `Free and Pro: we answer by email, usually within 2 business days. Team and Enterprise have priority support. For urgent account access issues email [${sup}](mailto:${sup}) directly. To report abuse of a Codexa-hosted site, use the form with "Abuse" in the subject.` }] },
    ],
  },
  "/feedback": {
    path: "/feedback",
    eyebrow: "Support",
    title: "Feedback",
    intro: "Tell us what to improve: confusing screens, missing docs, copy that is wrong, or things you liked. Everything is read by the team that builds the product.",
    sections: [],
  },
  "/report-bug": {
    path: "/report-bug",
    eyebrow: "Support",
    title: "Report a bug",
    intro: "Something is broken. Tell us what you did, what you expected, and what happened. The page URL and severity help us reproduce it quickly.",
    sections: [
      { id: "before", heading: "Before you report", blocks: [{ type: "list", items: ["Check the [status page](/status) in case a component is already known to be down.", "Look at [troubleshooting](/docs/troubleshooting) for common errors.", "For security vulnerabilities use the [vulnerability reporting form](/vulnerability-reporting) instead; it goes to a different queue."] }] },
    ],
  },
  "/request-feature": {
    path: "/request-feature",
    eyebrow: "Support",
    title: "Request a feature",
    intro: "Suggest something. The most useful requests describe the problem you are trying to solve, not only the feature you imagine.",
    sections: [
      { id: "roadmap", heading: "Check the roadmap first", blocks: [{ type: "paragraph", text: "Some things are already planned: concurrent editing, SDK and CLI, SSO, custom domain verification. See the [roadmap](/roadmap). If your request is there, tell us anyway; it helps with prioritisation." }] },
    ],
  },
  "/system-requirements": {
    path: "/system-requirements",
    eyebrow: "Support",
    title: "System requirements",
    intro: "Codexa runs in the browser. Projects run on our servers, not on your machine, so the requirements are modest.",
    sections: [
      { id: "browser", heading: "Browser", blocks: [{ type: "paragraph", text: "A current version of Chrome, Edge, Firefox, or Safari. See [browser support](/browser-support) for details. JavaScript and cookies must be enabled; the editor and realtime presence need WebSockets." }] },
      { id: "device", heading: "Device", blocks: [{ type: "list", items: ["The editor works best at 1024px wide or more. Marketing pages, docs, dashboards, and settings work down to 360px.", "4 GB of RAM is enough for the browser; project builds run in the sandbox.", "A stable connection: previews stream logs and the agent streams progress."] }] },
      { id: "network", heading: "Network", blocks: [{ type: "paragraph", text: "Codexa needs HTTPS to the application origin, the preview hostname, and the WebSocket endpoint. Corporate proxies that block WebSockets will break live presence and log streaming; the editor still works." }] },
      { id: "mobile", heading: "Mobile", blocks: [{ type: "paragraph", text: "There are no native mobile apps. The site and dashboard work on phones; editing code on a phone is possible but not comfortable." }] },
    ],
  },
  "/browser-support": {
    path: "/browser-support",
    eyebrow: "Support",
    title: "Browser support",
    intro: "Which browsers we test against and what to do if yours is not listed.",
    sections: [
      { id: "supported", heading: "Supported", blocks: [{ type: "table", caption: "Supported browsers", columns: ["Browser", "Versions", "Notes"], rows: [["Chrome and Chromium-based (Edge, Brave)", "Last 2 major versions", "Primary test target, including the Monaco editor"], ["Firefox", "Last 2 major versions", "Tested"], ["Safari (macOS and iOS)", "Last 2 major versions", "Tested; some editor shortcuts differ"], ["Samsung Internet", "Current", "Marketing and dashboard pages only"]] }] },
      { id: "unsupported", heading: "Not supported", blocks: [{ type: "paragraph", text: "Internet Explorer, browsers without ES2020 support, or browsers with JavaScript disabled. The marketing site renders without JavaScript; the application does not." }] },
      { id: "features", heading: "Required features", blocks: [{ type: "list", items: ["WebSockets for presence and log streaming.", "Server-sent events (`EventSource`) for AI progress.", "`localStorage` for editor preferences.", "Cookies for sessions."] }] },
      { id: "problems", heading: "If something looks wrong", blocks: [{ type: "paragraph", text: "Update the browser, disable extensions that modify pages, and [report a bug](/report-bug) with the browser name and version." }] },
    ],
  },
};

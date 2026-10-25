import type { ContentPage } from "./types";
import { site } from "@/config/site";

const sup = site.company.supportEmail;
const sales = site.company.salesEmail;

export const COMPANY_PAGES: Record<string, ContentPage> = {
  "/about": {
    path: "/about",
    eyebrow: "Company",
    title: "About Codexa",
    intro: "Codexa is an early-stage, AI-native software development platform built by a small team in India for builders everywhere. This page says what we are and, just as importantly, what we are not yet.",
    sections: [
      { id: "what", heading: "What we are building", blocks: [{ type: "paragraph", text: "A workspace where you describe an application, an agent generates and edits real files, the project runs in an isolated sandbox, and you deploy from the same screen. We care about the code staying yours: ordinary files, a real editor, snapshots you can revert, and GitHub export." }] },
      { id: "stage", heading: "Where we are", blocks: [{ type: "list", items: ["Early stage. A small founding team; no outside funding to announce.", "No office locations to list; we work remotely.", "No customer logos, testimonials, or usage statistics on this site, because we would rather earn them than invent them.", "The product is in active development; the [changelog](/changelog) and [roadmap](/roadmap) show what has shipped and what is next."] }] },
      { id: "principles", heading: "How we work", blocks: [{ type: "list", items: ["Honest states: when something is not configured or not shipped, the product says so.", "Reversible by default: a snapshot before every AI run.", "Server-side enforcement for authorization and usage limits.", "Built for India and the world: INR and USD pricing, Razorpay and Stripe."] }] },
      { id: "contact", heading: "Get in touch", blocks: [{ type: "links", items: [{ label: "Contact", href: "/contact", description: "General questions." }, { label: "Careers", href: "/careers", description: "No open roles today; register interest." }, { label: "Press", href: "/press", description: "Facts, descriptions, and the mark." }, { label: "Mission", href: "/mission", description: "Why we are doing this." }] }] },
    ],
    cta: { title: "Try the product rather than the pitch", description: "The Free plan needs no card.", primary: { label: "Start Building Free", href: "/signup" }, secondary: { label: "How it works", href: "/how-it-works" } },
  },

  "/mission": {
    path: "/mission",
    eyebrow: "Company",
    title: "Make building software accessible to everyone",
    intro: "Our mission is to let anyone with an idea turn it into working software, without giving up the things professional developers rely on.",
    sections: [
      { id: "why", heading: "Why", blocks: [{ type: "paragraph", text: "Most people who could build useful software never do, because the distance between an idea and a running application is too long. AI closes a lot of that distance, but only if the result is real code you can inspect, run safely, and change later. Demos that cannot be edited or deployed do not count." }] },
      { id: "how", heading: "How", blocks: [{ type: "list", items: ["Generate real projects from starter templates, not proprietary formats.", "Validate in a sandbox before showing the result, and make every run reversible.", "Keep a real editor and a real runtime in the same place as the agent.", "Price in local currencies and support local payment methods, starting with India."] }] },
      { id: "what-not", heading: "What we will not do", blocks: [{ type: "list", items: ["Claim features we have not shipped.", "Fabricate customers, statistics, or certifications.", "Lock your code into the platform."] }] },
    ],
    cta: { title: "Build something", primary: { label: "Start Building Free", href: "/signup" }, secondary: { label: "About Codexa", href: "/about" } },
  },

  "/press": {
    path: "/press",
    eyebrow: "Company",
    title: "Press",
    intro: "Information for journalists and writers. We have no press coverage to list yet; here is what we can offer.",
    sections: [
      { id: "facts", heading: "Facts", blocks: [{ type: "definitions", items: [{ term: "Name", detail: "Codexa" }, { term: "What it is", detail: "An AI-native software development platform: prompt to full-stack app, edit, run in a sandbox, deploy." }, { term: "Stage", detail: "Early stage, small founding team, no funding or customer announcements." }, { term: "Location", detail: "Built in India, operated remotely." }, { term: "Pricing", detail: "Free, Pro, Team, and Enterprise plans in INR and USD; see [pricing](/pricing)." }] }] },
      { id: "descriptions", heading: "Approved descriptions", blocks: [{ type: "paragraph", text: "Short: Codexa turns ideas into working software." }, { type: "paragraph", text: `Long: ${site.description}` }] },
      { id: "assets", heading: "Assets", blocks: [{ type: "links", items: [{ label: "Press kit", href: "/press-kit", description: "The mark, wordmark, and usage rules." }, { label: "Brand guidelines", href: "/brand-guidelines", description: "Colours, typography, do and don't." }] }] },
      { id: "contact", heading: "Contact", blocks: [{ type: "paragraph", text: `For interviews or questions email [${sup}](mailto:${sup}) with "Press" in the subject, or use the [contact form](/contact).` }] },
    ],
  },

  "/press-kit": {
    path: "/press-kit",
    eyebrow: "Company",
    title: "Press kit",
    intro: "The Codexa mark and wordmark, with the rules for using them. The mark is rendered as SVG on this site; see the brand page for live examples.",
    sections: [
      { id: "mark", heading: "The mark", blocks: [{ type: "paragraph", text: "A rounded square containing a geometric \"C\" drawn as an open bracket, with a short accent bar in the primary blue. It is rendered in the foreground colour so it works on light and dark backgrounds. Minimum size: 24px. Clear space: at least half the mark's width on every side." }] },
      { id: "wordmark", heading: "The wordmark", blocks: [{ type: "paragraph", text: "\"CODEXA\" set in Geist Sans, semibold, uppercase, with wide letter-spacing (0.18em). Use it next to the mark or alone; never redraw or re-space it." }] },
      { id: "usage", heading: "Usage", blocks: [{ type: "list", items: ["Do use the mark to refer to Codexa, for example in an article or an integration listing.", "Do not alter the colours, rotate, add effects, or place it inside another shape.", "Do not use the mark to imply endorsement or partnership without written agreement.", "Do not use it as part of your own product name."] }] },
      { id: "download", heading: "Files", blocks: [{ type: "paragraph", text: "The mark is available as an SVG at [/icon](/icon) and the social preview image at [/opengraph-image](/opengraph-image). See the [brand page](/brand) for the mark on light and dark backgrounds." }] },
    ],
  },

  "/partners": {
    path: "/partners",
    eyebrow: "Company",
    title: "Partners",
    intro: "We do not have a formal partner programme or any partners to announce. If you build tools, teach, or run an agency and want to work with us, tell us about it.",
    sections: [
      { id: "types", heading: "Partnerships we are interested in", blocks: [{ type: "list", items: ["Education: bootcamps and institutions that teach with real projects; see [education](/solutions/education).", "Agencies: studios delivering client projects on Codexa; see [agencies](/solutions/agencies).", "Technology: database, hosting, and payment providers that want a first-class integration; see [integrations](/integrations).", "Community: meetups and user groups in India and elsewhere."] }] },
      { id: "status", heading: "Status", blocks: [{ type: "note", variant: "info", title: "In review", text: "Partner terms, co-marketing, and any commercial arrangements are being defined. We will not promise anything we cannot deliver yet; submissions below are read by the founding team." }] },
    ],
  },

  "/affiliate-program": {
    path: "/affiliate-program",
    eyebrow: "Company",
    title: "Affiliate programme",
    intro: "Not launched. There are no affiliate links, commissions, or tracking in the product today. You can register interest and we will email you if and when a programme opens.",
    sections: [
      { id: "status", heading: "Status", blocks: [{ type: "note", variant: "warning", title: "Not launched", text: "We have not set commission rates, cookie windows, or payout terms, and any such details you may see elsewhere are not from us." }] },
      { id: "what-we-consider", heading: "What we are considering", blocks: [{ type: "list", items: ["Referral credit for Pro and Team sign-ups.", "Content partnerships with educators and creators.", "Transparent tracking that respects the [cookie policy](/cookie-policy)."] }] },
    ],
  },

  "/community": {
    path: "/community",
    eyebrow: "Company",
    title: "Community",
    intro: "Where the Codexa community meets today: GitHub. We do not run a Discord or forum yet and will not pretend otherwise.",
    sections: [
      { id: "github", heading: "GitHub", blocks: [{ type: "paragraph", text: `Discussions, issues, and feature requests happen in the Codexa repository on GitHub: [${site.social.github}](${site.social.github}). Use Discussions for questions and ideas, Issues for bugs you can reproduce.` }] },
      { id: "showcase", heading: "Showcase", blocks: [{ type: "paragraph", text: "Projects published by Codexa users appear in the [showcase](/showcase). You can submit your own from a project's share settings." }] },
      { id: "other", heading: "Other ways to reach us", blocks: [{ type: "links", items: [{ label: "Request a feature", href: "/request-feature", description: "Tell us what to build next." }, { label: "Report a bug", href: "/report-bug", description: "Something is broken." }, { label: "Feedback", href: "/feedback", description: "Anything else." }, { label: "Newsletter", href: "/newsletter", description: "Product updates by email, roughly monthly." }] }] },
    ],
  },

  "/careers": {
    path: "/careers",
    eyebrow: "Company",
    title: "Careers",
    intro: "There are no open roles at the moment. Codexa is an early-stage company with a small founding team. If you would like to hear about future openings, leave your details below.",
    sections: [
      { id: "roles", heading: "Open roles", blocks: [{ type: "note", variant: "info", title: "None right now", text: "We will list roles here when we open them. We do not post roles anywhere else first." }] },
      { id: "work", heading: "What working here would look like", blocks: [{ type: "list", items: ["Remote-first; no office.", "A TypeScript codebase: Next.js, PostgreSQL, a sandboxed runner service, and an AI agent.", "Small team, broad ownership, and a strong preference for honest product states over demos."] }] },
    ],
  },

  "/contact": {
    path: "/contact",
    eyebrow: "Company",
    title: "Contact",
    intro: "Questions, partnership ideas, or anything that does not fit the other forms. We read every message.",
    sections: [
      { id: "direct", heading: "Direct email", blocks: [{ type: "definitions", items: [{ term: "Support", detail: `[${sup}](mailto:${sup}) for account and product help` }, { term: "Sales", detail: `[${sales}](mailto:${sales}) for Team and Enterprise` }, { term: "Security", detail: `[${site.company.securityEmail}](mailto:${site.company.securityEmail}) for vulnerability reports` }, { term: "Privacy", detail: `[${site.company.privacyEmail}](mailto:${site.company.privacyEmail}) for data requests` }] }] },
    ],
  },
};

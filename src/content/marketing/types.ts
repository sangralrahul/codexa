import type { LucideIcon } from "lucide-react";
import type { VignetteId } from "@/components/vignettes/registry";

export type { VignetteId };

/** Area tint for the site backdrop (globals.css `[data-tone]`). */
export type Tone = "product" | "trust" | "docs" | "pricing" | "company";

export type CTALink = { label: string; href: string };

/** Inline text may contain markdown-style links: [label](/path). */
export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { type: "note"; variant?: "info" | "warning" | "success"; title?: string; text: string }
  | { type: "links"; items: { label: string; href: string; description?: string }[] }
  | { type: "code"; code: string; language?: string }
  | { type: "definitions"; items: { term: string; detail: string }[] }
  /** Three-up feature cards (title + one line, inline icon). */
  | { type: "features"; items: Feature[] }
  /** Label + value pairs. Values must be computed from code or config (PLANS, TEMPLATES…), never typed in. */
  | { type: "facts"; items: { label: string; value: string; note?: string }[]; source?: string }
  /** Numbered steps (film strip). */
  | { type: "steps"; items: Step[] }
  /** Copy beside a product vignette (labelled as an illustration). */
  | { type: "split"; text: string; visual: VignetteId; caption?: string; points?: string[] }
  /** A named SVG diagram. */
  | { type: "diagram"; name: "request-path"; caption?: string }
  /** An inline call to action. */
  | { type: "cta"; title: string; description?: string; primary: CTALink; secondary?: CTALink };

export type ContentSection = {
  id: string;
  heading: string;
  /** Short label for the in-page index (defaults to the heading). */
  navLabel?: string;
  blocks: ContentBlock[];
};

export type Crumb = { name: string; path: string };

export type ContentPage = {
  path: string;
  /** The page's full sentence. With a `headline`, it becomes the lede under the h1. */
  title: string;
  intro: string;
  eyebrow?: string;
  /** Curated h1 (six words or fewer). Without it the title is the h1. */
  headline?: string;
  /** Part of the headline set in the selection mark (H1 only, written by a person). */
  mark?: string;
  /** Part of the headline set in the two-tone dim (written by a person). */
  highlight?: string;
  /** Hero visual for landing pages. */
  visual?: VignetteId;
  /** Short name for navigation (defaults to the route manifest's navLabel). */
  navLabel?: string;
  /** landing: split hero + alternating rows; article: 68ch reading measure; legal: + progress, revised pill, print styles. Default: legal when `review` or `updated` is set, else article. */
  variant?: "landing" | "article" | "legal";
  tone?: Tone;
  /** Render a visible "requires legal/security review" callout. */
  review?: "legal" | "security" | "both";
  /** ISO date of last revision, shown for policies. */
  updated?: string;
  breadcrumbs?: Crumb[];
  sections: ContentSection[];
  cta?: { title: string; description?: string; primary: CTALink; secondary?: CTALink };
};

export type Feature = { title: string; description: string; icon?: LucideIcon; href?: string };
export type Step = { title: string; description: string; /** Vignette the sticky stage shows while this step is active. */ visual?: VignetteId };
export type FAQItem = { question: string; answer: string };
export type Limitation = string;

export type ProductPage = {
  path: string;
  eyebrow: string;
  /** The page's full sentence; shown as the lede under the curated headline. */
  title: string;
  subtitle: string;
  /** Curated h1, six words or fewer. */
  headline: string;
  /** Part of the headline set in the selection mark. */
  mark?: string;
  /** Part of the headline set in the two-tone dim. */
  highlight?: string;
  /** Vignette in the hero window. */
  visual: VignetteId;
  /** Two vignettes for the feature bento (defaults are derived from the steps). */
  bento?: [VignetteId, VignetteId];
  navLabel?: string;
  /** One sentence shown under the hero, used for "what it is" positioning. */
  positioning?: string;
  features: Feature[];
  featuresHeading?: string;
  steps?: Step[];
  stepsHeading?: string;
  sections?: ContentSection[];
  limitations: Limitation[];
  faq?: FAQItem[];
  related?: { label: string; href: string }[];
  showPreview?: boolean;
  cta?: { title: string; description?: string };
};

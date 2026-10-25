import type { LucideIcon } from "lucide-react";

/** Inline text may contain markdown-style links: [label](/path). */
export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { type: "note"; variant?: "info" | "warning" | "success"; title?: string; text: string }
  | { type: "links"; items: { label: string; href: string; description?: string }[] }
  | { type: "code"; code: string; language?: string }
  | { type: "definitions"; items: { term: string; detail: string }[] };

export type ContentSection = {
  id: string;
  heading: string;
  blocks: ContentBlock[];
};

export type Crumb = { name: string; path: string };

export type ContentPage = {
  path: string;
  title: string;
  intro: string;
  eyebrow?: string;
  /** Render a visible "requires legal/security review" callout. */
  review?: "legal" | "security" | "both";
  /** ISO date of last revision, shown for policies. */
  updated?: string;
  breadcrumbs?: Crumb[];
  sections: ContentSection[];
  cta?: { title: string; description?: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } };
};

export type Feature = { title: string; description: string; icon?: LucideIcon; href?: string };
export type Step = { title: string; description: string };
export type FAQItem = { question: string; answer: string };
export type Limitation = string;

export type ProductPage = {
  path: string;
  eyebrow: string;
  title: string;
  subtitle: string;
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

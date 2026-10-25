import type { ProjectSettings } from "@/db/schema";

export type TemplateCategory =
  | "websites"
  | "web-apps"
  | "saas"
  | "dashboards"
  | "ecommerce"
  | "portfolios"
  | "ai-tools"
  | "admin-panels"
  | "crm"
  | "landing-pages"
  | "mobile-first";

/**
 * Runtime frameworks. Templates may only use vite-react, static and node-express
 * (the runner has prebuilt dependency sets for those); "nextjs" exists for the
 * roadmap and for typing project rows, never for templates.
 */
export type Framework = "vite-react" | "static" | "node-express" | "nextjs";

export type TemplateDifficulty = "beginner" | "intermediate" | "advanced";

export type Template = {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: TemplateCategory;
  tags: string[];
  framework: Framework;
  /** Dependencies documented for the template (from its package.json). */
  dependencies: Record<string, string>;
  settings: ProjectSettings;
  files: Record<string, string>;
  /** Whether the runner has a prebuilt shared node_modules set for this framework. */
  prebuilt: boolean;
  featured?: boolean;
  difficulty: TemplateDifficulty;
  /** Preview path to open after the dev server starts. */
  previewPath?: string;
};

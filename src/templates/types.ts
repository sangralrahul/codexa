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

export type Framework = "vite-react" | "static" | "node-express" | "nextjs";

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
  difficulty: "beginner" | "intermediate" | "advanced";
  /** Preview path to open after the dev server starts. */
  previewPath?: string;
};

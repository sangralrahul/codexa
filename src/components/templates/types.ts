import type { TemplateCategory, TemplateDifficulty } from "@/templates";

/** Client-safe template metadata (no file contents, no settings). Mirrors summarizeTemplate() from @/templates. */
export type TemplateCardData = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  framework: string;
  frameworkName: string;
  tags: string[];
  difficulty: TemplateDifficulty;
  featured?: boolean;
  fileCount: number;
};

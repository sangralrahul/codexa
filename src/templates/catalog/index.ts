import type { Template } from "../types";
import { saasTemplate } from "./saas";
import { storefrontTemplate } from "./storefront";
import { crmTemplate } from "./crm";
import { adminTemplate } from "./admin";
import { aiChatTemplate } from "./ai-chat";
import { mobileShellTemplate } from "./mobile-shell";
import { portfolioReactTemplate } from "./portfolio-react";
import { opsDashboardTemplate } from "./ops-dashboard";
import { tasksTemplate } from "./tasks";
import { staticBlogTemplate } from "./static-blog";
import { staticLandingTemplate } from "./static-landing";
import { nodeJsonApiTemplate } from "./node-json-api";

/** Additional starters. The base templates (first of each framework) live in ../vite-react.ts, ../static.ts and ../node-express.ts. */
export const catalogTemplates: Template[] = [
  saasTemplate,
  storefrontTemplate,
  crmTemplate,
  adminTemplate,
  aiChatTemplate,
  mobileShellTemplate,
  portfolioReactTemplate,
  opsDashboardTemplate,
  tasksTemplate,
  staticBlogTemplate,
  staticLandingTemplate,
  nodeJsonApiTemplate,
];

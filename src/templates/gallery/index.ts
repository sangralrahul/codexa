import type { Template } from "../types";
import { websiteTemplates } from "./websites";
import { landingTemplates } from "./landing";
import { portfolioTemplates } from "./portfolios";
import { ecommerceTemplates } from "./ecommerce";
import { dashboardTemplates } from "./dashboards";
import { webAppTemplates } from "./apps";
import { saasTemplates } from "./saas";

/** The template gallery: data-driven templates built from the kits in ../kits. */
export const galleryTemplates: Template[] = [
  ...websiteTemplates,
  ...landingTemplates,
  ...portfolioTemplates,
  ...ecommerceTemplates,
  ...dashboardTemplates,
  ...webAppTemplates,
  ...saasTemplates,
];

/**
 * Central plan configuration. This is the single source of truth for
 * entitlements and displayed pricing. Prices are configurable and must be
 * approved by the business before launch; the server enforces the limits.
 */
import type { Currency, Plan } from "@/db/schema";

export type PlanLimits = {
  projects: number; // max active projects per workspace (-1 = unlimited)
  members: number; // max workspace members
  aiRequestsPerMonth: number;
  aiTokensPerMonth: number;
  runtimeMinutesPerMonth: number;
  deploymentsPerMonth: number;
  storageMb: number;
  concurrentRuntimes: number;
  customDomains: number;
  privateProjects: boolean;
  prioritySupport: boolean;
};

export type PlanPrice = { month: number; year: number }; // in minor units (paise / cents) per month

export type PlanDefinition = {
  id: Plan;
  name: string;
  tagline: string;
  audience: string;
  prices: Record<Currency, PlanPrice> | null; // null = contact sales
  limits: PlanLimits;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "For learning and small experiments.",
    audience: "Students and first projects",
    prices: { INR: { month: 0, year: 0 }, USD: { month: 0, year: 0 } },
    limits: {
      projects: 3,
      members: 1,
      aiRequestsPerMonth: 50,
      aiTokensPerMonth: 500_000,
      runtimeMinutesPerMonth: 300,
      deploymentsPerMonth: 5,
      storageMb: 250,
      concurrentRuntimes: 1,
      customDomains: 0,
      privateProjects: true,
      prioritySupport: false,
    },
    features: ["3 projects", "50 AI requests / month", "5 hours of preview runtime", "5 deployments / month", "Community support"],
    cta: { label: "Start Building Free", href: "/signup" },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For independent developers shipping real products.",
    audience: "Indie hackers and founders",
    prices: { INR: { month: 149900, year: 124900 }, USD: { month: 2000, year: 1600 } },
    limits: {
      projects: 25,
      members: 1,
      aiRequestsPerMonth: 1000,
      aiTokensPerMonth: 10_000_000,
      runtimeMinutesPerMonth: 6000,
      deploymentsPerMonth: 100,
      storageMb: 5000,
      concurrentRuntimes: 3,
      customDomains: 3,
      privateProjects: true,
      prioritySupport: false,
    },
    features: [
      "25 projects",
      "1,000 AI requests / month",
      "100 hours of preview runtime",
      "100 deployments / month",
      "Custom domains",
      "GitHub sync",
    ],
    cta: { label: "Upgrade to Pro", href: "/signup?plan=pro" },
    highlight: true,
  },
  team: {
    id: "team",
    name: "Team",
    tagline: "For product teams and agencies working together.",
    audience: "Teams and agencies",
    prices: { INR: { month: 399900, year: 329900 }, USD: { month: 5000, year: 4000 } },
    limits: {
      projects: 100,
      members: 10,
      aiRequestsPerMonth: 5000,
      aiTokensPerMonth: 50_000_000,
      runtimeMinutesPerMonth: 30000,
      deploymentsPerMonth: 500,
      storageMb: 25000,
      concurrentRuntimes: 10,
      customDomains: 20,
      privateProjects: true,
      prioritySupport: true,
    },
    features: [
      "Up to 10 members",
      "5,000 AI requests / month",
      "500 hours of preview runtime",
      "Roles and permissions",
      "Shared projects and activity history",
      "Priority support",
    ],
    cta: { label: "Start a Team", href: "/signup?plan=team" },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom limits, security review, and dedicated support.",
    audience: "Large organizations",
    prices: null,
    limits: {
      projects: -1,
      members: -1,
      aiRequestsPerMonth: -1,
      aiTokensPerMonth: -1,
      runtimeMinutesPerMonth: -1,
      deploymentsPerMonth: -1,
      storageMb: -1,
      concurrentRuntimes: 50,
      customDomains: -1,
      privateProjects: true,
      prioritySupport: true,
    },
    features: [
      "Custom usage limits",
      "SSO and audit log export (on request)",
      "Dedicated environments",
      "Security questionnaire support",
      "Invoice billing",
    ],
    cta: { label: "Contact Sales", href: "/contact-sales" },
  },
};

export const PLAN_ORDER: Plan[] = ["free", "pro", "team", "enterprise"];

export function getPlan(plan: Plan): PlanDefinition {
  return PLANS[plan];
}

export function isUnlimited(n: number) {
  return n < 0;
}

export function formatPrice(minor: number, currency: Currency, locale?: string): string {
  const loc = locale ?? (currency === "INR" ? "en-IN" : "en-US");
  return new Intl.NumberFormat(loc, { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

export function detectCurrency(countryCode?: string | null): Currency {
  return countryCode?.toUpperCase() === "IN" ? "INR" : "USD";
}

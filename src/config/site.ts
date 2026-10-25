export const site = {
  name: "Codexa",
  tagline: "Turn ideas into working software.",
  description:
    "Codexa is an AI-native software development platform. Describe your idea, generate a full-stack application, edit the code, run it, debug it, and deploy it.",
  // NEXT_PUBLIC_APP_URL (fixed at build time) wins, then the server's APP_URL
  // (a Worker variable on Cloudflare); on Vercel the system variables give the deployment URL.
  url:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000"),
  company: {
    legalName: "Codexa",
    supportEmail: "support@codexa.app",
    securityEmail: "security@codexa.app",
    salesEmail: "sales@codexa.app",
    privacyEmail: "privacy@codexa.app",
  },
  social: {
    github: "https://github.com/sangralrahul/codexa",
  },
  defaultCurrency: "USD" as const,
} as const;

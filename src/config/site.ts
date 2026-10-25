export const site = {
  name: "Codexa",
  tagline: "Turn ideas into working software.",
  description:
    "Codexa is an AI-native software development platform. Describe your idea, generate a full-stack application, edit the code, run it, debug it, and deploy it.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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

import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// `next dev` gets the same Cloudflare bindings as production (local D1, R2,
// Durable Objects) from wrangler.jsonc, persisted in .wrangler/state.
if (process.env.NODE_ENV === "development") void initOpenNextCloudflareForDev();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Always HTTPS for two years (covers sub-subdomains of the app host only).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No framing by other sites, no <base> hijacking, no plugins.
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  // We use the request-time rendering model (no Cache Components) because the
  // product is dominated by authenticated, per-request pages and APIs.
  cacheComponents: false,
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "ws", "http-proxy", "tar", "wrangler"],
  // pg loads its Cloudflare socket adapter only on Workers, so file tracing
  // does not see it; include it so the OpenNext bundle can resolve it.
  // (Docs content ships inside the bundle as JSON, see src/lib/content.)
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pg-cloudflare/**/*"],
  },
  // `NEXT_OUTPUT=standalone npm run build` produces a self-contained server
  // (used by the Docker image and to simulate serverless file tracing locally).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/get-started", destination: "/signup", permanent: false },
      { source: "/not-found", destination: "/404", permanent: false },
    ];
  },
};

export default nextConfig;

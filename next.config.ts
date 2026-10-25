import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // We use the request-time rendering model (no Cache Components) because the
  // product is dominated by authenticated, per-request pages and APIs.
  cacheComponents: false,
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "ws", "http-proxy", "tar"],
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

import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Rendered per request: these are cheap, and serving them from the prerender
// cache makes the Cloudflare Worker try to rewrite a read-only cache.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/settings", "/admin", "/api", "/share", "/onboarding"],
      },
    ],
    sitemap: new URL("/sitemap.xml", site.url).toString(),
    host: site.url,
  };
}

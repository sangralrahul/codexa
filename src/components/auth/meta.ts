import type { Metadata } from "next";
import { pageMetadata, routeMetadata } from "@/lib/seo";

/**
 * Account-page metadata. pageMetadata() already ends the title with " · Codexa", and the root
 * layout's title template would append the site name a second time ("Sign in · Codexa · Codexa"),
 * so the account pages pin their title as absolute. Everything else (noindex, canonical, Open Graph)
 * comes from the route manifest unchanged.
 */
function absolute(meta: Metadata): Metadata {
  return typeof meta.title === "string" ? { ...meta, title: { absolute: meta.title } } : meta;
}

export function authMetadata(path: string): Metadata {
  return absolute(routeMetadata(path));
}

export function authPageMetadata(input: Parameters<typeof pageMetadata>[0]): Metadata {
  return absolute(pageMetadata(input));
}

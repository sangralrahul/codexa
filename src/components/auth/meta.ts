import type { Metadata } from "next";
import { pageMetadata, routeMetadata } from "@/lib/seo";

/**
 * Account-page metadata: everything (absolute "X · Codexa" title, noindex, canonical, Open Graph)
 * comes from the route manifest via src/lib/seo.ts.
 */
export function authMetadata(path: string): Metadata {
  return routeMetadata(path);
}

export function authPageMetadata(input: Parameters<typeof pageMetadata>[0]): Metadata {
  return pageMetadata(input);
}

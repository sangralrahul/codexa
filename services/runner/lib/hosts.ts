/**
 * Host-header routing for the preview proxy.
 *   <token>.<previewHost>  → sandbox session (dev server)
 *   <slug>.<deployHost>    → deployed static site
 * (or <token><previewHost> when the base starts with "-"; see src/lib/hosts.ts)
 * Everything else is unknown and gets a 404 page.
 */
import { labelFor } from "../../../src/lib/hosts";

export type HostRoute = { kind: "preview"; token: string } | { kind: "site"; slug: string } | { kind: "unknown"; host: string };

export function stripPort(host: string): string {
  // IPv6 literal hosts ([::1]:4100) are never valid preview hosts; treat as-is.
  if (host.startsWith("[")) return host.toLowerCase();
  return host.replace(/:\d+$/, "").toLowerCase();
}

export function routeHost(rawHost: string | undefined, previewHost: string, deployHost: string): HostRoute {
  const host = stripPort((rawHost ?? "").trim());
  if (!host) return { kind: "unknown", host };
  const sub = (base: string): string | null => labelFor(host, base || null);
  const token = sub(previewHost);
  if (token) return { kind: "preview", token };
  const slug = sub(deployHost);
  if (slug) return { kind: "site", slug };
  return { kind: "unknown", host };
}

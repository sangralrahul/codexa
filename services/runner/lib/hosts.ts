/**
 * Host-header routing for the preview proxy.
 *   <token>.<previewHost>  → sandbox session (dev server)
 *   <slug>.<deployHost>    → deployed static site
 * Everything else is unknown and gets a 404 page.
 */
export type HostRoute = { kind: "preview"; token: string } | { kind: "site"; slug: string } | { kind: "unknown"; host: string };

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function stripPort(host: string): string {
  // IPv6 literal hosts ([::1]:4100) are never valid preview hosts; treat as-is.
  if (host.startsWith("[")) return host.toLowerCase();
  return host.replace(/:\d+$/, "").toLowerCase();
}

export function routeHost(rawHost: string | undefined, previewHost: string, deployHost: string): HostRoute {
  const host = stripPort((rawHost ?? "").trim());
  if (!host) return { kind: "unknown", host };
  const sub = (base: string): string | null => {
    if (!host.endsWith("." + base)) return null;
    const label = host.slice(0, host.length - base.length - 1);
    if (!LABEL.test(label) || label.includes(".")) return null;
    return label;
  };
  const token = sub(previewHost);
  if (token) return { kind: "preview", token };
  const slug = sub(deployHost);
  if (slug) return { kind: "site", slug };
  return { kind: "unknown", host };
}

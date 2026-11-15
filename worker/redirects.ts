/**
 * Moving Codexa to a new domain: requests to the old addresses get a permanent redirect to the
 * new ones, keeping the path and query, so bookmarks, shared links and published sites keep working.
 *
 *   <old app host>, www.<old app host>  → https://<CANONICAL_HOST>/…
 *   www.<CANONICAL_HOST>                 → https://<CANONICAL_HOST>/…
 *   <slug><LEGACY_DEPLOY_HOST>           → https://<slug><DEPLOY_HOST>/…   (published sites)
 *
 * Previews are not redirected: their addresses are created fresh each time a project runs.
 * Dependency-free so it can be unit tested without the Worker runtime.
 */
import { hostBase, hostFor, labelFor } from "../src/lib/hosts";

export type RedirectEnv = {
  /** The app's address, e.g. codexa.host. */
  CANONICAL_HOST?: string;
  /** Old app addresses, comma separated, e.g. codexa.creditvault.tech. */
  LEGACY_APP_HOSTS?: string;
  /** The old base for published sites, e.g. -sites.creditvault.tech. */
  LEGACY_DEPLOY_HOST?: string;
  /** The current base for published sites, e.g. -sites.codexa.host. */
  DEPLOY_HOST?: string;
};

const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((h) => hostBase(h))
    .filter((h): h is string => Boolean(h));

/** The redirect target for this request, or null when it should be served normally. */
export function legacyRedirect(url: URL, env: RedirectEnv): string | null {
  const host = url.hostname.toLowerCase();
  const canonical = hostBase(env.CANONICAL_HOST);
  const rest = `${url.pathname}${url.search}`;

  if (canonical && host !== canonical) {
    if (host === `www.${canonical}`) return `https://${canonical}${rest}`;
    for (const old of list(env.LEGACY_APP_HOSTS)) {
      if (old === canonical) continue;
      if (host === old || host === `www.${old}`) return `https://${canonical}${rest}`;
    }
  }

  const legacySites = siteBase(env.LEGACY_DEPLOY_HOST);
  const sites = siteBase(env.DEPLOY_HOST);
  if (legacySites && sites && legacySites !== sites) {
    const slug = labelFor(host, legacySites);
    if (slug) return `https://${hostFor(slug, sites)}${rest}`;
  }
  return null;
}

/** A site base normalised like hostBase but keeping the leading dash of the one-level form (-sites.example.com). */
function siteBase(v?: string): string | null {
  const t = v?.trim();
  if (!t) return null;
  const dash = t.startsWith("-");
  const base = hostBase(dash ? t.slice(1) : t);
  return base ? `${dash ? "-" : ""}${base}` : null;
}

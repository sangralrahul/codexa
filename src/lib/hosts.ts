/**
 * Addresses of previews and Codexa-hosted sites, shared by the app, the
 * Cloudflare Worker and the runner (keep this file dependency-free).
 *
 * PREVIEW_HOST / DEPLOY_HOST are a base that a label (preview token or site
 * slug) is attached to:
 *   "preview.example.com"   → <label>.preview.example.com  (two levels deep)
 *   "-preview.example.com"  → <label>-preview.example.com  (one level deep)
 * The one-level form is covered by Cloudflare's free *.example.com
 * certificate; the two-level form needs an advanced certificate.
 */

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Base without scheme, path or port, lowercased; null when empty. */
export function hostBase(value: string | undefined | null): string | null {
  if (!value) return null;
  const h = value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").toLowerCase();
  return h || null;
}

/** Full host for `label` under `base` (`base` may keep a :port). */
export function hostFor(label: string, base: string): string {
  return base.startsWith("-") ? `${label}${base}` : `${label}.${base}`;
}

/** The label when `host` (no port) is exactly one label under `base`, else null. */
export function labelFor(host: string, base: string | null): string | null {
  if (!base) return null;
  const suffix = base.startsWith("-") ? base : `.${base}`;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, host.length - suffix.length);
  return LABEL.test(label) ? label : null;
}

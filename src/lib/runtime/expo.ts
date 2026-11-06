/**
 * Expo Go helpers for the preview's "Your Device" mode. Pure functions (client- and server-safe).
 *
 * An Expo project's dev server (Metro, `expo start`) answers the Expo Go manifest on the same
 * host as the web preview: Expo Go requests `/` with an `expo-platform: ios|android` header. The
 * runner sets EXPO_PACKAGER_PROXY_URL to the public preview URL, so the bundle URLs inside that
 * manifest point back at the preview host too.
 *
 * Expo Go opens `exp://host[:port]` over http and `exps://host[:port]` over https.
 */

/** Official store listings for Expo Go. */
export const EXPO_GO_STORE_LINKS = {
  ios: "https://apps.apple.com/app/expo-go/id982107779",
  android: "https://play.google.com/store/apps/details?id=host.exp.exponent",
} as const;

/** The Expo Go deep link for a preview URL, or null when the URL is not http(s). */
export function expoGoUrl(previewUrl: string | null | undefined): string | null {
  if (!previewUrl) return null;
  let u: URL;
  try {
    u = new URL(previewUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  // URL.host already omits the scheme's default port (443 / 80) and keeps any other port.
  return `${u.protocol === "https:" ? "exps" : "exp"}://${u.host}`;
}

export type PhoneReachability = { reachable: true } | { reachable: false; reason: string };

/**
 * Whether a phone on another network could open this preview at all. Loopback and *.localhost
 * names only resolve on this computer; private ranges only inside the same network.
 */
export function phoneReachability(previewUrl: string | null | undefined): PhoneReachability {
  if (!previewUrl) return { reachable: false, reason: "There is no preview address yet." };
  let host: string;
  try {
    host = new URL(previewUrl).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return { reachable: false, reason: "The preview address is not a valid URL." };
  }
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1" || /^127\./.test(host) || host === "0.0.0.0") {
    return { reachable: false, reason: "This preview runs on localhost, which only this computer can open, so a phone cannot reach it. Expo Go needs a public preview domain." };
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { reachable: false, reason: `This preview is served from a private address (${host}). Expo Go can only open it from a phone on the same network.` };
  }
  return { reachable: true };
}

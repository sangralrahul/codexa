import { PageEnter } from "@/components/marketing/page-enter";

/**
 * Re-mounts on every settings sub-page change (the (app) template does not, because the
 * "settings" segment stays the same), so only the content column eases in while the
 * settings nav, rendered by the layout, stays put and glides its pill.
 */
export default function SettingsTemplate({ children }: { children: React.ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}

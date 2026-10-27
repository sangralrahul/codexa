import "@/components/marketing/marketing.css";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Backdrop } from "@/components/marketing/backdrop";
import { getChromeData } from "@/components/marketing/chrome-data";
import { buildHeaderWells } from "@/components/marketing/header-wells";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [user, chrome] = await Promise.all([getCurrentUser(), getChromeData()]);
  return (
    <div className="site-shell relative isolate flex flex-1 flex-col">
      {/* The CSS-only area wash behind the header and the top of inner pages (no canvas; hidden on home,
          which owns the page's one live Horizon). Pages tint it with data-tone on an element inside <main>. */}
      <Backdrop variant="wash" still className="site-backdrop" />
      <MarketingHeader signedIn={Boolean(user)} wells={buildHeaderWells(chrome)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

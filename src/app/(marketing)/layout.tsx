import "@/components/marketing/marketing.css";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { getChromeData } from "@/components/marketing/chrome-data";
import { buildHeaderWells } from "@/components/marketing/header-wells";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [user, chrome] = await Promise.all([getCurrentUser(), getChromeData()]);
  return (
    <div className="site-shell relative isolate flex flex-1 flex-col bg-background">
      <MarketingHeader signedIn={Boolean(user)} wells={buildHeaderWells(chrome)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

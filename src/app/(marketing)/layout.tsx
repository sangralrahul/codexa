import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <MarketingHeader signedIn={Boolean(user)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}

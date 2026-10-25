import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Backdrop } from "@/components/marketing/backdrop";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="relative isolate flex flex-1 flex-col">
      {/* One animated backdrop behind the header and the top of every public page. */}
      <Backdrop className="-z-10 bottom-auto h-[min(1000px,120vh)]" />
      <MarketingHeader signedIn={Boolean(user)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

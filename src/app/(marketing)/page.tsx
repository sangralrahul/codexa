import { Suspense } from "react";
import { routeMetadata, jsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import { capabilities } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { listDocs } from "@/lib/content";
import { getHomeData } from "@/components/marketing/home/data";
import { HomeView } from "@/components/marketing/home/home-view";
import { HomeStatus } from "@/components/marketing/home/home-status";
import { HomeStatusPill } from "@/components/marketing/home/home-status-pill";
import "@/components/marketing/home/home.css";

export const metadata = routeMetadata("/");

export default async function HomePage() {
  const [user, changelogDocs] = await Promise.all([getCurrentUser(), listDocs("changelog").catch(() => [])]);
  const signedIn = Boolean(user);
  const data = getHomeData();
  const changelog = changelogDocs.slice(0, 3).map((d) => ({ title: d.title, date: d.date, href: d.href }));
  const latest = changelog[0] ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            { "@type": "Organization", name: site.name, url: site.url, logo: new URL("/icon", site.url).toString(), sameAs: [site.social.github], contactPoint: [{ "@type": "ContactPoint", email: site.company.supportEmail, contactType: "customer support" }] },
            { "@type": "WebSite", name: site.name, url: site.url },
            {
              "@type": "SoftwareApplication",
              name: site.name,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              url: site.url,
              description: site.description,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free plan" },
            },
          ],
        })}
      />
      <HomeView
        data={data}
        signedIn={signedIn}
        aiReady={capabilities.ai}
        announcement={latest ? { title: latest.title, href: latest.href } : null}
        changelog={changelog}
        status={
          <Suspense fallback={<HomeStatusPill overall="checking" />}>
            <HomeStatus />
          </Suspense>
        }
      />
    </>
  );
}

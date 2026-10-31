import { routeMetadata, jsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";
import { getHomeData } from "@/components/marketing/home/data";
import { HomeView } from "@/components/marketing/home/home-view";
import "@/components/marketing/home/home.css";

export const metadata = routeMetadata("/");

export default async function HomePage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);
  const data = getHomeData();

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
      <HomeView data={data} signedIn={signedIn} />
    </>
  );
}

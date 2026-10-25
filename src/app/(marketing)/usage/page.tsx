import { routeMetadata } from "@/lib/seo";
import { PRICING_PAGES } from "@/content/marketing/pricing";
import { PageTemplate } from "@/components/marketing/page-template";

const PATH = "/usage";
export const metadata = routeMetadata(PATH);

export default function Page() {
  return <PageTemplate page={PRICING_PAGES[PATH]} />;
}

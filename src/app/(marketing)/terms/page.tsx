import { routeMetadata } from "@/lib/seo";
import { TRUST_PAGES } from "@/content/marketing/trust";
import { PageTemplate } from "@/components/marketing/page-template";

const PATH = "/terms";
export const metadata = routeMetadata(PATH);

export default function Page() {
  return <PageTemplate page={TRUST_PAGES[PATH]} />;
}

import { routeMetadata } from "@/lib/seo";
import { TRUST_PAGES } from "@/content/marketing/trust";
import { PageTemplate } from "@/components/marketing/page-template";

const PATH = "/acceptable-use";
export const metadata = routeMetadata(PATH);

export default function Page() {
  return <PageTemplate page={TRUST_PAGES[PATH]} />;
}

import { routeMetadata } from "@/lib/seo";
import { COMPANY_PAGES } from "@/content/marketing/company";
import { PageTemplate } from "@/components/marketing/page-template";

const PATH = "/press";
export const metadata = routeMetadata(PATH);

export default function Page() {
  return <PageTemplate page={COMPANY_PAGES[PATH]} />;
}

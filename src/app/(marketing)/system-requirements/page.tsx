import { routeMetadata } from "@/lib/seo";
import { SUPPORT_PAGES } from "@/content/marketing/support";
import { PageTemplate } from "@/components/marketing/page-template";

const PATH = "/system-requirements";
export const metadata = routeMetadata(PATH);

export default function Page() {
  return <PageTemplate page={SUPPORT_PAGES[PATH]} />;
}

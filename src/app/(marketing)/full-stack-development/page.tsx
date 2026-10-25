import { routeMetadata } from "@/lib/seo";
import { PRODUCT_PAGES } from "@/content/marketing/product";
import { ProductPageTemplate } from "@/components/marketing/product-page";

const PATH = "/full-stack-development";
export const metadata = routeMetadata(PATH);

export default function Page() {
  return <ProductPageTemplate page={PRODUCT_PAGES[PATH]} />;
}

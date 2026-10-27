import { routeMetadata } from "@/lib/seo";
import { SUPPORT_PAGES } from "@/content/marketing/support";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/feedback";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={SUPPORT_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="e3 rounded-[20px] p-6 sm:p-7">
        <h2 id="form-heading" className="text-display-4">Share feedback</h2>
        <SupportForm
          kind="feedback"
          
          
          submitLabel="Send feedback"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name" }, { name: "email" }, { name: "topic", options: [{ value: "product", label: "Product" }, { value: "docs", label: "Documentation" }, { value: "website", label: "Website" }, { value: "pricing", label: "Pricing" }, { value: "other", label: "Other" }] }, { name: "subject", label: "In one line" }, { name: "message", label: "Details" }]}
        />
      </section>
    </PageTemplate>
  );
}

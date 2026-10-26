import { routeMetadata } from "@/lib/seo";
import { PRICING_PAGES } from "@/content/marketing/pricing";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/enterprise";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={PRICING_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="e3 rounded-[20px] p-6 sm:p-7">
        <h2 id="form-heading" className="text-display-4">Talk to us about Enterprise</h2>
        <SupportForm
          kind="sales"
          topic="enterprise"
          defaultSubject="Enterprise enquiry"
          submitLabel="Contact sales"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name", required: true }, { name: "email" }, { name: "company", required: true }, { name: "message", label: "Team size, requirements, and timeline" }]}
        />
      </section>
    </PageTemplate>
  );
}

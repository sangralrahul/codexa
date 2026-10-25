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
    <PageTemplate page={PRICING_PAGES[PATH]}>
      <section aria-labelledby="form-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Talk to us about Enterprise</h2>
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

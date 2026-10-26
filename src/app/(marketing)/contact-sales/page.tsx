import { routeMetadata } from "@/lib/seo";
import { PRICING_PAGES } from "@/content/marketing/pricing";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/contact-sales";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={PRICING_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="glow-card rounded-2xl border border-border p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Tell us about your team</h2>
        <SupportForm
          kind="sales"
          
          defaultSubject="Sales enquiry"
          submitLabel="Contact sales"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name", required: true }, { name: "email" }, { name: "company", required: true }, { name: "topic", label: "Plan of interest", options: [{ value: "team", label: "Team" }, { value: "enterprise", label: "Enterprise" }, { value: "unsure", label: "Not sure yet" }] }, { name: "message", label: "Requirements" }]}
        />
      </section>
    </PageTemplate>
  );
}

import { routeMetadata } from "@/lib/seo";
import { COMPANY_PAGES } from "@/content/marketing/company";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/partners";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={COMPANY_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="glow-card rounded-2xl border border-border p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Propose a partnership</h2>
        <SupportForm
          kind="contact"
          topic="partners"
          defaultSubject="Partnership proposal"
          submitLabel="Send proposal"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name", required: true }, { name: "email" }, { name: "company", required: true }, { name: "topic", label: "Partnership type", options: [{ value: "education", label: "Education" }, { value: "agency", label: "Agency" }, { value: "technology", label: "Technology" }, { value: "community", label: "Community" }, { value: "other", label: "Other" }] }, { name: "message", label: "What do you have in mind?" }]}
        />
      </section>
    </PageTemplate>
  );
}

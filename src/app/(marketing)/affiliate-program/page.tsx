import { routeMetadata } from "@/lib/seo";
import { COMPANY_PAGES } from "@/content/marketing/company";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/affiliate-program";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={COMPANY_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="e3 rounded-[20px] p-6 sm:p-7">
        <h2 id="form-heading" className="text-display-4">Register interest</h2>
        <SupportForm
          kind="contact"
          topic="affiliate"
          defaultSubject="Affiliate programme interest"
          submitLabel="Register interest"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name" }, { name: "email" }, { name: "message", label: "Where would you promote Codexa?", placeholder: "Your site, channel, newsletter, or community, and roughly how many people it reaches." }]}
        />
      </section>
    </PageTemplate>
  );
}

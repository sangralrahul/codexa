import { routeMetadata } from "@/lib/seo";
import { COMPANY_PAGES } from "@/content/marketing/company";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/contact";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={COMPANY_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="e3 rounded-[20px] p-6 sm:p-7">
        <h2 id="form-heading" className="text-display-4">Send a message</h2>
        <SupportForm
          kind="contact"
          
          
          submitLabel="Send message"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name" }, { name: "email" }, { name: "subject" }, { name: "message" }]}
        />
      </section>
    </PageTemplate>
  );
}

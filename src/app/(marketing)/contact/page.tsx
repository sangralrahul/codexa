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
    <PageTemplate page={COMPANY_PAGES[PATH]}>
      <section aria-labelledby="form-heading" className="glow-card rounded-2xl border border-border p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Send a message</h2>
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

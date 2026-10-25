import { routeMetadata } from "@/lib/seo";
import { SUPPORT_PAGES } from "@/content/marketing/support";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/request-feature";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={SUPPORT_PAGES[PATH]}>
      <section aria-labelledby="form-heading" className="glow-card rounded-2xl border border-border p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Describe the feature</h2>
        <SupportForm
          kind="feature"
          
          
          submitLabel="Submit request"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name" }, { name: "email" }, { name: "subject", label: "Feature in one line" }, { name: "message", label: "What problem would it solve?", rows: 7 }]}
        />
      </section>
    </PageTemplate>
  );
}

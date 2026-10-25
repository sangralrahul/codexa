import { routeMetadata } from "@/lib/seo";
import { SUPPORT_PAGES } from "@/content/marketing/support";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/support";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={SUPPORT_PAGES[PATH]}>
      <section aria-labelledby="form-heading" className="glow-card rounded-2xl border border-border p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Contact support</h2>
        <SupportForm
          kind="support"
          
          
          submitLabel="Send to support"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name" }, { name: "email" }, { name: "topic", options: [{ value: "account", label: "Account and sign-in" }, { value: "billing", label: "Billing and plans" }, { value: "project", label: "Projects and editor" }, { value: "runtime", label: "Preview and deployment" }, { value: "ai", label: "AI agent" }, { value: "abuse", label: "Report abuse" }, { value: "other", label: "Other" }] }, { name: "subject" }, { name: "message" }]}
        />
      </section>
    </PageTemplate>
  );
}

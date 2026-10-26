import { routeMetadata } from "@/lib/seo";
import { PRICING_PAGES } from "@/content/marketing/pricing";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/startup-program";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={PRICING_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="glow-card rounded-2xl border border-border p-6">
        <h2 id="form-heading" className="text-xl font-semibold tracking-tight">Register interest</h2>
        <SupportForm
          kind="sales"
          topic="startup"
          defaultSubject="Startup programme interest"
          submitLabel="Register interest"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name", required: true }, { name: "email" }, { name: "company", label: "Startup name", required: true }, { name: "message", label: "What are you building and what stage are you at?" }]}
        />
      </section>
    </PageTemplate>
  );
}

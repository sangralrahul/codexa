import { routeMetadata } from "@/lib/seo";
import { SUPPORT_PAGES } from "@/content/marketing/support";
import { PageTemplate } from "@/components/marketing/page-template";
import { SupportForm } from "@/components/forms/support-form";
import { getCurrentUser } from "@/lib/auth/session";

const PATH = "/report-bug";
export const metadata = routeMetadata(PATH);

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <PageTemplate page={SUPPORT_PAGES[PATH]} layout="form">
      <section aria-labelledby="form-heading" className="e3 rounded-[20px] p-6 sm:p-7">
        <h2 id="form-heading" className="text-display-4">Describe the bug</h2>
        <SupportForm
          kind="bug"
          
          
          submitLabel="Submit bug report"
          className="mt-5 space-y-4"
          defaults={user ? { name: user.name || undefined, email: user.email } : undefined}
          fields={[{ name: "name" }, { name: "email" }, { name: "subject", label: "Summary", placeholder: "For example: Preview does not start for Express projects" }, { name: "pageUrl" }, { name: "severity" }, { name: "message", label: "Steps to reproduce, expected and actual result", rows: 8 }]}
        />
      </section>
    </PageTemplate>
  );
}

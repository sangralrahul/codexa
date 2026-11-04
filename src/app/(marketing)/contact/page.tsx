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
    <PageTemplate
      page={COMPANY_PAGES[PATH]}
      layout="form"
      meta={[
        { label: "Replies", value: "By email, from the team" },
        { label: "Also", value: "Support, sales, security and privacy addresses on this page" },
      ]}
    >
      <section aria-labelledby="form-heading" className="rounded-[12px] border border-border bg-(--pg-panel) p-6 sm:p-7">
        <p className="mk-eyebrow">
          <i aria-hidden="true" />
          <span>Message</span>
        </p>
        <h2 id="form-heading" className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.035em]">
          Send <span className="text-(--g-dim)">a message.</span>
        </h2>
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

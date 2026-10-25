import Link from "next/link";
import { ShieldX } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/access-denied");

export default function AccessDeniedPage() {
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <ShieldX className="size-10 text-danger" aria-hidden="true" />
      <PageTitle className="mt-4">Access denied</PageTitle>
      <p className="mt-3 max-w-md text-muted-foreground">You do not have permission to view this page. If you believe you should, ask a workspace owner or admin to change your role, or sign in with a different account.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard" className={buttonClasses("primary", "md")}>
          Go to dashboard
        </Link>
        <Link href="/login" className={buttonClasses("outline", "md")}>
          Sign in with another account
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Still stuck? Email <a href={`mailto:${site.company.supportEmail}`} className="font-medium text-primary underline underline-offset-4">{site.company.supportEmail}</a>.
      </p>
    </section>
  );
}

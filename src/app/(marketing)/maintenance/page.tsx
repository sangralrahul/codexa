import Link from "next/link";
import { Wrench } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";

export const metadata = routeMetadata("/maintenance");

export default function MaintenancePage() {
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Wrench className="size-10 text-warning" aria-hidden="true" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Codexa is undergoing maintenance</h1>
      <p className="mt-3 max-w-md text-muted-foreground">Part of the platform is temporarily unavailable while we make changes. Your projects, snapshots, and deployments are safe. Check the status page for live component state.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/status" className={buttonClasses("primary", "md")}>
          View status
        </Link>
        <Link href="/" className={buttonClasses("outline", "md")}>
          Back to homepage
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Questions: <a href={`mailto:${site.company.supportEmail}`} className="font-medium text-primary underline underline-offset-4">{site.company.supportEmail}</a>
      </p>
    </section>
  );
}

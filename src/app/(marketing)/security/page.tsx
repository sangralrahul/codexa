import Link from "next/link";
import { ArrowRight, Check, ShieldAlert } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { TRUST_PAGES } from "@/content/marketing/trust";
import { PageTemplate } from "@/components/marketing/page-template";

const PATH = "/security";
export const metadata = routeMetadata(PATH);

const IMPLEMENTED = [
  { label: "Generated code never runs in the web app", href: "#sandboxing" },
  { label: "Secrets encrypted before storage, never sent back", href: "#secrets" },
  { label: "httpOnly sessions; tokens hashed at rest", href: "#accounts" },
  { label: "Rate limits on sign-in, AI and public forms", href: "#rate-limiting" },
  { label: "Audit log of security-relevant actions", href: "#audit" },
];

/** The honesty panel: what we do not have, stated first, then what is implemented (each item links to its section). */
function HonestyPanel() {
  return (
    <div className="e4 overflow-hidden">
      <div className="relative border-b border-border bg-warning/[0.06] p-6 sm:p-8">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-warning" />
        <ShieldAlert className="size-6 text-warning" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-display-4 mt-4">No third-party certifications yet</h2>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-foreground/80">
          Codexa has not completed SOC 2, ISO 27001, HIPAA, PCI DSS or any other third-party audit, and has not had a third-party penetration test. This page describes the controls in the code so you can assess them yourself.
        </p>
        <Link href="/contact-sales" className="link-draw mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground">
          Ask for our security questionnaire answers <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-label text-muted-foreground">What is implemented</p>
        <ul className="mt-4 space-y-1">
          {IMPLEMENTED.map((i) => (
            <li key={i.href + i.label}>
              <a href={i.href} className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-foreground/[0.04]">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="flex-1 text-[14.5px]">{i.label}</span>
                <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Page() {
  return <PageTemplate page={TRUST_PAGES[PATH]} visual={<HonestyPanel />} />;
}

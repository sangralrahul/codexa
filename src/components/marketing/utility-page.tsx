import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Kicker } from "./page-header";

/** Short status pages (access denied, maintenance): one centred message, two actions and the support address. */
export function UtilityPage({
  icon: Icon,
  tone = "warning",
  kicker,
  title,
  body,
  actions,
}: {
  icon: LucideIcon;
  tone?: "warning" | "danger";
  kicker: string;
  title: string;
  body: string;
  actions: { label: string; href: string }[];
}) {
  return (
    <section data-tone="docs" className="relative overflow-hidden">
      <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0 -z-10" />
      <div className="container-x flex min-h-[64vh] flex-col items-center justify-center py-20 text-center">
        <span className={cn("inline-flex size-14 items-center justify-center rounded-[18px] border bg-card shadow-lg", tone === "danger" ? "border-danger/30 text-danger" : "border-warning/30 text-warning")}>
          <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <Kicker className="mt-8 justify-center">{kicker}</Kicker>
        <h1 className="text-display-2 mt-5 max-w-[18ch]">{title}</h1>
        <p className="text-lead mx-auto mt-5">{body}</p>
        <div className="mt-9 flex flex-col gap-3 xs:flex-row">
          {actions.map((a, i) => (
            <Link key={a.href} href={a.href} className={buttonClasses(i === 0 ? "secondary" : "outline", "lg")}>
              {a.label}
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Still stuck? Email{" "}
          <a href={`mailto:${site.company.supportEmail}`} className="link-draw font-medium text-foreground">
            {site.company.supportEmail}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

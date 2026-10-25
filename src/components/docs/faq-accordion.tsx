"use client";

import { Accordion } from "radix-ui";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { FaqGroup } from "@/lib/content/faq";

/** Grouped FAQ accordion (Radix): keyboard operable, one open item per group. */
export function FaqAccordion({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.id} id={g.id} aria-labelledby={`faq-${g.id}`} className="scroll-mt-24">
          <h2 id={`faq-${g.id}`} className="text-xl font-semibold tracking-tight">
            {g.title}
          </h2>
          <Accordion.Root type="single" collapsible className="mt-4 divide-y divide-border rounded-lg border border-border">
            {g.items.map((item, i) => {
              const value = `${g.id}-${i}`;
              return (
                <Accordion.Item key={value} value={value}>
                  <Accordion.Header asChild>
                    <h3 className="m-0">
                      <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span>{item.q}</span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180" aria-hidden="true" />
                      </Accordion.Trigger>
                    </h3>
                  </Accordion.Header>
                  <Accordion.Content className="px-4 pb-4 text-sm text-muted-foreground">
                    <p>{item.a}</p>
                    {item.href ? (
                      <Link href={item.href} className="mt-2 inline-block text-primary underline">
                        Read more
                      </Link>
                    ) : null}
                  </Accordion.Content>
                </Accordion.Item>
              );
            })}
          </Accordion.Root>
        </section>
      ))}
    </div>
  );
}

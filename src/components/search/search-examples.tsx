"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { openSearch } from "./search-dialog";

/** Example queries as chips; each opens the site search pre-filled with it. */
export function SearchExamples({ examples, label = "Try", className }: { examples: string[]; label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-meta text-muted-foreground">{label}</span>
      {examples.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => openSearch(q)}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-[12.5px] text-muted-foreground transition-colors duration-(--dur-2) hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Search className="size-3" aria-hidden="true" />
          {q}
        </button>
      ))}
    </div>
  );
}

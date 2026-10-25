"use client";

import Link from "next/link";
import { Search } from "lucide-react";

// Stub: replaced by the docs/search agent. Keep export names stable.
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <Link href="/docs" className={className} aria-label="Search documentation">
      <Search className="size-4" aria-hidden="true" />
    </Link>
  );
}

export function SearchDialog() {
  return null;
}

"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { RepoList } from "./repo-list";

/** Dashboard list of the user's repositories with Import buttons. */
export function GithubRepoBrowser() {
  return (
    <RepoList
      renderAction={(r) => (
        <Link href={`/import-project?repo=${encodeURIComponent(r.fullName)}`} className={buttonClasses("outline", "sm")}>
          <Download className="size-4" aria-hidden="true" /> Import
        </Link>
      )}
    />
  );
}

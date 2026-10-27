"use client";

import { useRouter } from "next/navigation";
import { FolderGit2, LayoutTemplate, Sparkles } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";

type Tab = "describe" | "template" | "import";

/** The creation hub's three ways to start, for pages outside the hub (Import from GitHub). Each option navigates. */
export function CreateTabs({ current, className }: { current: Tab; className?: string }) {
  const router = useRouter();
  return (
    <Segmented<Tab>
      aria-label="How do you want to start?"
      value={current}
      onValueChange={(v) => router.push(v === "import" ? "/import-project" : v === "template" ? "/new-project?tab=template" : "/new-project")}
      className={className ?? "mb-8 max-w-full overflow-x-auto"}
      options={[
        { value: "describe", label: "Describe it", icon: <Sparkles /> },
        { value: "template", label: <ResponsiveLabel short="Template" long="Start from template" />, icon: <LayoutTemplate /> },
        { value: "import", label: <ResponsiveLabel short="Import" long="Import from GitHub" />, icon: <FolderGit2 /> },
      ]}
    />
  );
}

/** A short label on phones, the full one from 640px up (only the visible one is in the accessible name). */
function ResponsiveLabel({ short, long }: { short: string; long: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{long}</span>
    </>
  );
}

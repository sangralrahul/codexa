"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useLaunch } from "@/components/motion/launch";

function overlayOpen() {
  return Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], .launch-overlay'));
}

/**
 * "Open editor" for the most recent project. The card grows into the Launch panel (one honest
 * row, "Opening the editor", while the route loads). With `enterToResume`, pressing Enter while
 * nothing on the page has focus resumes the project too.
 */
export function ResumeButton({ href, name, enterToResume = false }: { href: string; name: string; enterToResume?: boolean }) {
  const router = useRouter();
  const { start, element } = useLaunch({ title: `Opening ${name}` });

  useEffect(() => {
    if (!enterToResume) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) return;
      if (overlayOpen()) return;
      e.preventDefault();
      start(document.querySelector<HTMLElement>("[data-resume-card]"), [{ id: "open", label: "Opening the editor", state: "active" }]);
      router.push(href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enterToResume, href, router, start]);

  return (
    <>
      <Link
        href={href}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          start(e.currentTarget.closest<HTMLElement>("[data-resume-card]") ?? e.currentTarget, [{ id: "open", label: "Opening the editor", state: "active" }]);
          router.push(href);
        }}
        className={buttonClasses("primary", "md", "group/open relative z-[2] h-9 gap-2 px-4")}
      >
        Open editor
        <ArrowRight className="size-4 transition-transform duration-(--dur-3) ease-snap group-hover/open:translate-x-0.5 calm:transition-none" aria-hidden="true" />
      </Link>
      {enterToResume ? (
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
          or press
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded-[5px] border border-border bg-muted px-1.5 font-sans text-[11px] font-medium text-foreground">
            <CornerDownLeft className="size-3" aria-hidden="true" />
            Enter
          </kbd>
          to resume
        </span>
      ) : null}
      {element}
    </>
  );
}

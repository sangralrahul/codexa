"use client";

import { usePathname } from "next/navigation";
import { ProjectsSkeleton } from "@/components/app/skeletons";
import EditorLoading from "./[id]/loading";

/**
 * /projects placeholder. This boundary also wraps /projects/[id] while that segment loads, so
 * anything below /projects shows the editor-shaped placeholder instead of the project grid.
 */
export default function Loading() {
  const pathname = usePathname();
  return pathname === "/projects" ? <ProjectsSkeleton /> : <EditorLoading />;
}

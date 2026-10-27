"use client";

import { usePathname } from "next/navigation";
import { DashboardSkeleton } from "@/components/app/skeletons";
import AppLoading from "../loading";

/** The cockpit placeholder for /dashboard; nested dashboard pages (templates, shared, GitHub) get the generic one. */
export default function Loading() {
  const pathname = usePathname();
  return pathname === "/dashboard" ? <DashboardSkeleton /> : <AppLoading />;
}

import "server-only";
import Link from "next/link";
import { getStatus } from "@/app/(marketing)/status/health";
import { HomeStatusPill } from "./home-status-pill";

/** Live status pill for the proof strip (same checks as /status). Streamed in under Suspense. */
export async function HomeStatus() {
  let overall: "operational" | "degraded" | "down" | "unknown" = "unknown";
  let notConfigured = 0;
  try {
    const report = await getStatus();
    overall = report.overall === "operational" || report.overall === "degraded" || report.overall === "down" ? report.overall : "unknown";
    notConfigured = report.components.filter((c) => c.state === "not_configured").length;
  } catch {
    overall = "unknown";
  }
  return (
    <Link href="/status" className="rounded-full">
      <HomeStatusPill overall={overall} notConfigured={notConfigured} />
    </Link>
  );
}

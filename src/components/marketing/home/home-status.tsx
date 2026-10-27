import "server-only";
import Link from "next/link";
import { getStatus } from "@/app/(marketing)/status/health";
import { HomeStatusPill } from "./home-status-pill";

/** Short component names for the pill ("Runner unreachable"); the /status page has the long ones. */
const SHORT: Record<string, string> = { web: "Web app", database: "Database", runner: "Runner", ai: "AI", email: "Email" };

/** Live status pill for the proof strip (same checks as /status). Streamed in under Suspense. */
export async function HomeStatus() {
  let overall: "operational" | "degraded" | "down" | "unknown" = "unknown";
  let affected: string[] = [];
  let notConfigured = 0;
  try {
    const report = await getStatus();
    overall = report.overall === "operational" || report.overall === "degraded" || report.overall === "down" ? report.overall : "unknown";
    // The components behind the overall state: the down ones for "down", the degraded ones for "degraded".
    affected = report.components.filter((c) => c.state === overall && (overall === "down" || overall === "degraded")).map((c) => SHORT[c.id] ?? c.name);
    notConfigured = report.components.filter((c) => c.state === "not_configured").length;
  } catch {
    overall = "unknown";
  }
  return (
    <Link href="/status" className="inline-flex max-w-full rounded-full">
      <HomeStatusPill overall={overall} affected={affected} notConfigured={notConfigured} />
    </Link>
  );
}

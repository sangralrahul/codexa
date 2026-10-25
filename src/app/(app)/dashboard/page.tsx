import { PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";

export const metadata = { title: "Dashboard", robots: { index: false } };

// Placeholder: replaced by the workspace agent.
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const { current } = await getCurrentWorkspace(user);
  return (
    <div className="container-x py-8">
      <PageHeader title={`Welcome, ${user.name}`} description={current ? `Workspace: ${current.workspace.name}` : undefined} />
    </div>
  );
}

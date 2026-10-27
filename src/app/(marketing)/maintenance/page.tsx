import { Wrench } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { UtilityPage } from "@/components/marketing/utility-page";

export const metadata = routeMetadata("/maintenance");

export default function MaintenancePage() {
  return (
    <UtilityPage
      icon={Wrench}
      kicker="Maintenance"
      title="Codexa is undergoing maintenance"
      body="Part of the platform is temporarily unavailable while we make changes. Your projects, snapshots, and deployments are safe. Check the status page for live component state."
      actions={[
        { label: "View status", href: "/status" },
        { label: "Back to homepage", href: "/" },
      ]}
    />
  );
}

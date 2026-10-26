import { ShieldX } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { UtilityPage } from "@/components/marketing/utility-page";

export const metadata = routeMetadata("/access-denied");

export default function AccessDeniedPage() {
  return (
    <UtilityPage
      icon={ShieldX}
      tone="danger"
      kicker="Access denied"
      title="You don't have access to this page"
      body="If you believe you should, ask a workspace owner or admin to change your role, or sign in with a different account."
      actions={[
        { label: "Go to dashboard", href: "/dashboard" },
        { label: "Sign in with another account", href: "/login" },
      ]}
    />
  );
}

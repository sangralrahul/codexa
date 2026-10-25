import { routeMetadata } from "@/lib/seo";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/reset-password");

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Choose a new password">
      {token ? <ResetPasswordForm token={token} /> : <Alert variant="warning">This link is missing a reset token. Request a new link from the forgot-password page.</Alert>}
    </AuthCard>
  );
}

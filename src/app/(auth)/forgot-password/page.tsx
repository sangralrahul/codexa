import { authMetadata } from "@/components/auth/meta";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { one } from "@/components/auth/params";
import { capabilities } from "@/lib/env";

export const metadata = authMetadata("/forgot-password");

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Reset your password" description="Enter the email you signed up with. If it has an account, we'll send a link to choose a new password.">
      <ForgotPasswordForm emailConfigured={capabilities.email} email={one(sp.email)?.slice(0, 254)} />
    </AuthCard>
  );
}

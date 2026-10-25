import { routeMetadata } from "@/lib/seo";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata = routeMetadata("/forgot-password");

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" description="Enter your email and we will send you a reset link.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}

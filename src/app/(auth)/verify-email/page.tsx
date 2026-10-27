import { authMetadata } from "@/components/auth/meta";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmail } from "@/components/auth/forms";

export const metadata = authMetadata("/verify-email");

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Verify your email." highlight="email." description="Confirming your address unlocks deployments.">
      <VerifyEmail token={token ?? null} />
    </AuthCard>
  );
}

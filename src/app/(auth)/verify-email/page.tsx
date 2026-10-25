import { routeMetadata } from "@/lib/seo";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmail } from "@/components/auth/forms";

export const metadata = routeMetadata("/verify-email");

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Verify your email">
      <VerifyEmail token={token ?? null} />
    </AuthCard>
  );
}

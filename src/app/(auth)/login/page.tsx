import { Suspense } from "react";
import { routeMetadata } from "@/lib/seo";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { capabilities } from "@/lib/env";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/login");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; verified?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Sign in to Codexa" description="Welcome back. Continue building.">
      {sp.reset ? <Alert variant="success" className="mb-4">Your password was updated. Sign in with your new password.</Alert> : null}
      <Suspense>
        <LoginForm githubEnabled={capabilities.github} />
      </Suspense>
    </AuthCard>
  );
}

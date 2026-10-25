import { Suspense } from "react";
import { routeMetadata } from "@/lib/seo";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/forms";
import { capabilities } from "@/lib/env";

export const metadata = routeMetadata("/signup");

export default function SignupPage() {
  return (
    <AuthCard title="Create your Codexa account" description="Free to start. No credit card required.">
      <Suspense>
        <SignupForm githubEnabled={capabilities.github} />
      </Suspense>
    </AuthCard>
  );
}

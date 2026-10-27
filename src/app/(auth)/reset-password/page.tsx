import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { authMetadata } from "@/components/auth/meta";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";

export const metadata = authMetadata("/reset-password");

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Choose a new password." highlight="new password." description={token ? "Use at least 8 characters with a letter and a number. You'll be signed out everywhere else." : undefined}>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-5">
          <Alert variant="warning" title="This link is missing its reset token">
            Open the link from your email again, or{" "}
            <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
              request a new link
            </Link>
            .
          </Alert>
          <Link href="/forgot-password" className={buttonClasses("primary", "lg", "w-full text-[15px]")}>
            Request a new link
          </Link>
          <Link href="/login" className="group inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      )}
    </AuthCard>
  );
}

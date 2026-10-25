"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/button";

/** Signs the current user out and sends them to the login page with the given `next` path. */
export function LogoutAndSwitch({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.push(`/login?next=${encodeURIComponent(next)}`);
      router.refresh();
    }
  }
  return (
    <Button variant="outline" className="w-full" onClick={go} loading={busy}>
      Sign out and switch account
    </Button>
  );
}

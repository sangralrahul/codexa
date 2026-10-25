import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Codexa" }, robots: { index: false, follow: false } };

/** Staff-only area. requireAdmin() redirects non-staff to /access-denied; every API under /api/v1/admin re-checks with requireApiAdmin(). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>;
}

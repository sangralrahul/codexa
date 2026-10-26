import { requireAdmin } from "@/lib/auth/guards";
import { emailSettings, explainEmailError, recentEmails } from "@/lib/email/diagnostics";
import { AdminPageHeader, EmptyRow, StatTile, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";
import { EmailTest } from "@/components/admin/email-test";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Email" };

export default async function AdminEmailPage() {
  const admin = await requireAdmin();
  const s = emailSettings();
  const rows = await recentEmails(25);
  const failed = rows.filter((r) => r.status === "failed").length;
  const lastError = rows.find((r) => r.status === "failed")?.error ?? null;
  const hint = explainEmailError(lastError);
  return (
    <div>
      <AdminPageHeader title="Email" description="Account emails (verification, password reset, invitations): setup, recent deliveries and a test send." />
      {!s.provider ? (
        <Alert variant="warning" title="No email provider configured" className="mb-6">
          Emails are only stored in the outbox. Set CUSTOMERIO_APP_API_KEY (and CUSTOMERIO_REGION, EMAIL_FROM) as Worker secrets, then deploy again.
        </Alert>
      ) : failed > 0 && lastError ? (
        <Alert variant="danger" title="Recent emails failed" className="mb-6">
          <p className="font-mono text-xs">{lastError}</p>
          {hint ? <p className="mt-2">{hint}</p> : null}
        </Alert>
      ) : null}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Provider" value={s.providerName ?? "None"} />
        <StatTile label="Region" value={s.region ? s.region.toUpperCase() : "—"} />
        <StatTile label="Sender domain" value={s.fromDomain ?? "—"} />
        <StatTile label="Failed (last 25)" value={failed} tone={failed > 0 ? "warning" : "default"} />
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        From address: <span className="font-mono text-foreground">{s.from}</span>
        {s.usesTemplate ? " · sent through a Customer.io transactional message template" : " · Codexa's own email design"}. The sender domain must be verified in Customer.io (Settings → Workspace Settings → Email → Sending domains).
      </p>
      <section className="mb-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Test delivery</h2>
        <EmailTest defaultTo={admin.email} />
      </section>
      <Table caption="Last 25 emails (newest first; message bodies are not shown because they contain sign-in links)">
        <thead>
          <tr>
            <Th>To</Th>
            <Th>Subject</Th>
            <Th>Status</Th>
            <Th>Provider</Th>
            <Th>Created</Th>
            <Th>Error</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={6}>No emails sent yet.</EmptyRow> : null}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="text-xs">{r.to}</Td>
              <Td className="text-xs">{r.subject}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td className="text-xs">{r.provider}</Td>
              <Td>
                <When value={r.createdAt} />
              </Td>
              <Td className="max-w-sm text-xs text-danger">{r.error ?? ""}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

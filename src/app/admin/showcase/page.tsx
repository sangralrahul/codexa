import Link from "next/link";
import { listShowcase } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Pagination, Table, Td, Th, When } from "@/components/admin/table";
import { ShowcaseReviewButtons } from "@/components/admin/actions";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Showcase" };

type SP = Promise<{ filter?: string; page?: string }>;

export default async function AdminShowcasePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const filter = sp.filter === "approved" || sp.filter === "all" ? sp.filter : "pending";
  const data = await listShowcase({ filter, page });
  return (
    <div>
      <AdminPageHeader title="Showcase" description="Community submissions. Approved entries appear on /showcase; rejecting deletes the submission so the author can resubmit." />
      <FilterForm action="/admin/showcase" values={{ filter }} fields={[{ name: "filter", label: "Show", type: "select", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "all", label: "All" }] }]} />
      <Table caption="Showcase entries">
        <thead>
          <tr>
            <Th>Entry</Th>
            <Th>Project</Th>
            <Th>Submitted by</Th>
            <Th>Tags</Th>
            <Th>Status</Th>
            <Th>Submitted</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {data.entries.length === 0 ? <EmptyRow colSpan={7}>Nothing to review.</EmptyRow> : null}
          {data.entries.map((e) => (
            <tr key={e.id}>
              <Td className="max-w-[24rem]">
                <p className="font-medium">{e.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{e.description}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {e.liveUrl ? (
                    <a href={e.liveUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Live site
                    </a>
                  ) : null}
                  {e.approvedAt ? (
                    <Link href={`/showcase/${e.slug}`} className="text-primary hover:underline">
                      Public page
                    </Link>
                  ) : null}
                </div>
              </Td>
              <Td className="text-xs">{e.projectName ?? "(deleted)"}</Td>
              <Td className="text-xs text-muted-foreground">{e.submitterEmail ?? "—"}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {e.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Td>
              <Td>{e.approvedAt ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}</Td>
              <Td>
                <When value={e.createdAt} />
              </Td>
              <Td>
                <ShowcaseReviewButtons id={e.id} approved={Boolean(e.approvedAt)} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/showcase" params={{ filter }} />
    </div>
  );
}

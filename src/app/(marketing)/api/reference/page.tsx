import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";
import { ApiReference } from "@/components/docs/api-reference";
import { endpointsByGroup, resolveAllEndpoints } from "@/lib/content/api-registry";

export const metadata = routeMetadata("/api/reference");

export default function ApiReferencePage() {
  const resolved = resolveAllEndpoints();
  const groups = endpointsByGroup(resolved);
  const implemented = resolved.filter((e) => e.resolvedStatus === "implemented").length;
  const planned = resolved.length - implemented;
  const md = `
This reference is generated from a hand-maintained registry of every endpoint in the API contract. Before rendering, each entry is checked against the server's own route files: an endpoint is shown as **Implemented** only when its handler exists on disk and exports the method. Anything else is shown as **Planned**, whatever the registry intended.

Currently **${implemented} implemented** and **${planned} planned** endpoints across ${groups.length} groups.

> Note: Planned endpoints describe the agreed contract for areas still being built. Do not rely on them until they appear as implemented here and in the changelog.

## Groups

${groups.map((g) => `- [${g.title}](#group-${g.id}) — ${g.endpoints.filter((e) => e.resolvedStatus === "implemented").length}/${g.endpoints.length} implemented`).join("\n")}
`;
  return (
    <DevArticle path="/api/reference" markdown={md} extraHeadings={groups.map((g) => ({ depth: 2 as const, text: g.title, id: `h-${g.id}` }))}>
      <div className="mt-10">
        <ApiReference groups={groups} />
      </div>
    </DevArticle>
  );
}

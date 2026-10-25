import { describe, expect, it } from "vitest";
import committed from "@/lib/content/api-manifest.generated.json";
import { resolveAllEndpoints, endpointKey } from "@/lib/content/api-registry";
import { buildApiManifest, resolveEndpointStatus } from "@/lib/content/api-registry-fs";
import { API_ENDPOINTS } from "@/lib/content/api-registry";

describe("API manifest", () => {
  it("committed manifest matches the source tree (run `npm run api:manifest` if this fails)", () => {
    expect(committed).toEqual(buildApiManifest(process.cwd()));
  });

  it("manifest-based resolution matches a live filesystem scan", () => {
    const fromManifest = resolveAllEndpoints();
    const fromFs = API_ENDPOINTS.map((e) => resolveEndpointStatus(e, process.cwd()));
    expect(fromManifest.map((e) => [endpointKey(e), e.resolvedStatus])).toEqual(fromFs.map((e) => [endpointKey(e), e.resolvedStatus]));
    expect(fromManifest.some((e) => e.resolvedStatus === "implemented")).toBe(true);
  });

  it("reports endpoints missing from the manifest as planned", () => {
    expect(resolveAllEndpoints({}).every((e) => e.resolvedStatus === "planned")).toBe(true);
  });
});

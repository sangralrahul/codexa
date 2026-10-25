import { describe, expect, it } from "vitest";
import committed from "@/lib/content/content.generated.json";
import { BundledContentSource, FilesystemContentSource } from "@/lib/content/source";
import { CONTENT_SECTIONS } from "@/lib/content/types";
import { buildContentBundle } from "../../../scripts/generate-content-bundle";

describe("bundled content (used in production and on Cloudflare Workers)", () => {
  it("committed bundle matches content/ (run `npm run content:bundle` if this fails)", () => {
    expect(committed).toEqual(buildContentBundle());
  });

  it("serves the same records as the filesystem source", async () => {
    const fsSource = new FilesystemContentSource();
    const bundled = new BundledContentSource();
    for (const section of CONTENT_SECTIONS) {
      const a = (await fsSource.list(section)).map((r) => [r.defaultSlug, r.raw]);
      const b = (await bundled.list(section)).map((r) => [r.defaultSlug, r.raw]);
      expect(b, section).toEqual(a);
    }
  });

  it("looks up by slug and rejects unsafe slugs", async () => {
    const bundled = new BundledContentSource();
    expect((await bundled.get("docs", "ai-agent"))?.defaultSlug).toBe("ai-agent");
    expect(await bundled.get("docs", "../secrets")).toBeNull();
    expect(await bundled.get("docs", "does-not-exist")).toBeNull();
  });
});

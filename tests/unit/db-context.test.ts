import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "@/db";

const CF = Symbol.for("__cloudflare-context__");
const g = globalThis as Record<symbol, unknown>;
afterEach(() => {
  delete g[CF];
});

describe("database client scoping", () => {
  it("reuses one client on Node.js", () => {
    expect(getDb()).toBe(getDb());
  });

  it("gives each Cloudflare request its own client and reuses it within the request", () => {
    const req1 = { env: {}, ctx: { waitUntil() {} } };
    const req2 = { env: {}, ctx: { waitUntil() {} } };
    g[CF] = req1;
    const a1 = getDb();
    const a2 = getDb();
    g[CF] = req2;
    const b = getDb();
    expect(a1).toBe(a2);
    expect(b).not.toBe(a1);
    delete g[CF];
    expect(getDb()).not.toBe(a1);
  });
});

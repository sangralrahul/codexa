import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, getDb, chunked, chunkedBySize, likeEscape } from "@/db";

describe("D1 database access", () => {
  it("resolves one client per D1 binding and talks to the local database", async () => {
    expect(getDb()).toBe(getDb());
    const rows = await db.all<{ one: number }>(sql`select 1 as one`);
    expect(rows[0].one).toBe(1);
  });

  it("chunks rows under the 100-parameter limit", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ a: i, b: i, c: i, d: i }));
    const chunks = chunked(rows);
    expect(chunks.flat()).toHaveLength(50);
    for (const c of chunks) expect(c.length * (4 + 4)).toBeLessThanOrEqual(90);
  });

  it("chunks rows by payload size", () => {
    const rows = Array.from({ length: 5 }, () => ({ content: "x".repeat(400_000) }));
    const chunks = chunkedBySize(rows, (r) => r.content.length);
    expect(chunks.flat()).toHaveLength(5);
    for (const c of chunks) expect(c.reduce((n, r) => n + r.content.length, 0)).toBeLessThanOrEqual(900_000);
  });

  it("escapes LIKE wildcards", () => {
    expect(likeEscape("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});

import { describe, expect, it } from "vitest";
import { analyzeSql, tokenizeSql } from "@/lib/integrations/sql-safety";

describe("sql tokenizer", () => {
  it("strips comments and string literals and splits statements", () => {
    const t = tokenizeSql("select 'drop table x' as s; -- delete from y\n/* truncate z */ select 2");
    expect(t).toEqual([["SELECT", "'STR'", "AS", "S"], ["SELECT", "2"]]);
  });
  it("handles dollar quoting and quoted identifiers", () => {
    const t = tokenizeSql(`select $$ delete from users $$, "drop" from "table"`);
    expect(t[0]).toEqual(["SELECT", "'STR'", '"IDENT"', "FROM", '"IDENT"']);
  });
});

describe("analyzeSql", () => {
  const destructive = (sql: string) => analyzeSql(sql).destructive;
  it("treats reads as read-only", () => {
    for (const sql of ["select * from users", "WITH x AS (select 1) select * from x", "explain analyze select 1", "show search_path", "values (1)", "table users"]) {
      const a = analyzeSql(sql);
      expect(a.readOnly, sql).toBe(true);
      expect(a.destructive, sql).toBe(false);
    }
  });
  it("flags DROP, TRUNCATE and ALTER", () => {
    expect(destructive("drop table users")).toBe(true);
    expect(destructive("TRUNCATE users")).toBe(true);
    expect(destructive("alter table users add column x int")).toBe(true);
    expect(analyzeSql("drop table users").reasons[0]).toMatch(/irreversible/);
  });
  it("flags DELETE/UPDATE without WHERE but allows them with WHERE", () => {
    expect(destructive("delete from users")).toBe(true);
    expect(destructive("update users set name = 'x'")).toBe(true);
    expect(destructive("delete from users where id = 1")).toBe(false);
    expect(destructive("update users set name = 'x' where id = 1")).toBe(false);
    expect(analyzeSql("delete from users where id = 1").readOnly).toBe(false);
    expect(analyzeSql("delete from users").reasons[0]).toMatch(/WHERE/);
  });
  it("does not misclassify FOR UPDATE, ON DELETE CASCADE, ON CONFLICT DO UPDATE", () => {
    expect(destructive("select * from users for update")).toBe(false);
    expect(destructive("create table a (b int references c on delete cascade)")).toBe(false);
    expect(destructive("insert into t (id) values (1) on conflict (id) do update set id = excluded.id")).toBe(false);
  });
  it("catches destructive statements hidden in CTEs and multi-statement input; comments and strings do not trigger", () => {
    expect(destructive("with d as (delete from users returning *) select count(*) from d")).toBe(true);
    expect(destructive("select 1; drop table users")).toBe(true);
    expect(destructive("-- drop table users\nselect 1")).toBe(false);
    expect(destructive("select 'delete from users'")).toBe(false);
  });
  it("reports an empty analysis for blank input", () => {
    const a = analyzeSql("   -- nothing\n");
    expect(a.statements).toHaveLength(0);
    expect(a.readOnly).toBe(false);
  });
});

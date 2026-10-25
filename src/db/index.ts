import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import type { BatchItem } from "drizzle-orm/batch";
import { requireBinding } from "@/lib/cloudflare/bindings";
import * as schema from "./schema";

/*
 * Database access: Cloudflare D1 through the `DB` binding.
 *
 * The binding comes from the current Cloudflare context (deployed Worker,
 * `next dev` via OpenNext, or local bindings in tests and scripts). `db` is a
 * proxy that resolves the client on every access, so callers write
 * `db.select()...` everywhere.
 *
 * D1 has no interactive transactions: use `db.batch([...])` for writes that
 * must succeed or fail together (generate ids up front when later statements
 * need them). A query may bind at most 100 parameters; use chunked() for
 * large multi-row inserts.
 */

export type Db = DrizzleD1Database<typeof schema>;

const clients = new WeakMap<object, Db>();

export function getDb(): Db {
  const binding = requireBinding("DB") as D1Database;
  let client = clients.get(binding);
  if (!client) {
    client = drizzle(binding as unknown as Parameters<typeof drizzle>[0], { schema });
    clients.set(binding, client);
  }
  return client;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** Split rows so each insert stays under D1's 100 bound-parameter limit. */
export function chunked<T extends Record<string, unknown>>(rows: T[], maxParams = 90): T[][] {
  if (!rows.length) return [];
  const perRow = Math.max(1, Object.keys(rows[0]).length + 4); // +4 for generated id/timestamps
  const size = Math.max(1, Math.floor(maxParams / perRow));
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** Split rows by size too: keep each statement's bound values well under D1's payload limits. */
export function chunkedBySize<T extends Record<string, unknown>>(rows: T[], sizeOf: (row: T) => number, opts: { maxParams?: number; maxBytes?: number } = {}): T[][] {
  const maxBytes = opts.maxBytes ?? 900_000;
  const out: T[][] = [];
  for (const group of chunked(rows, opts.maxParams)) {
    let current: T[] = [];
    let bytes = 0;
    for (const row of group) {
      const n = sizeOf(row);
      if (current.length && bytes + n > maxBytes) {
        out.push(current);
        current = [];
        bytes = 0;
      }
      current.push(row);
      bytes += n;
    }
    if (current.length) out.push(current);
  }
  return out;
}

/**
 * Run statements atomically. D1 executes a batch as one implicit
 * transaction: every statement succeeds or none do.
 */
export async function runBatch(items: BatchItem<"sqlite">[]) {
  if (!items.length) return [];
  return getDb().batch(items as unknown as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

/** Escape a value for use inside a LIKE pattern with ESCAPE '\\'. */
export function likeEscape(value: string) {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

export { schema };

/**
 * Schema inspection + guarded query execution for connected PostgreSQL databases.
 * No "server-only" import so the integration tests can exercise it directly; it is
 * only ever called from API routes after access checks.
 */
import type { Client, FieldDef } from "pg";
import { openPgClient, pgErrorMessage, PG_STATEMENT_TIMEOUT_MS } from "./providers/postgres";
import { analyzeSql } from "./sql-safety";
import { QUERY_ROW_LIMIT, type ColumnInfo, type QueryResultDto, type TableInfo } from "./types";

export class DatabaseQueryError extends Error {
  code: string;
  constructor(message: string, code = "query_failed") {
    super(message);
    this.code = code;
  }
}

export class ConfirmationRequiredError extends Error {
  reasons: string[];
  constructor(reasons: string[]) {
    super("This query contains destructive statements. Confirm to run it.");
    this.reasons = reasons;
  }
}

type Conn = { connectionString: string; ssl: boolean };

async function withClient<T>(conn: Conn, fn: (client: Client) => Promise<T>): Promise<T> {
  let client: Client | null = null;
  try {
    client = await openPgClient(conn.connectionString, conn.ssl);
    return await fn(client);
  } catch (err) {
    if (err instanceof ConfirmationRequiredError || err instanceof DatabaseQueryError) throw err;
    throw new DatabaseQueryError(pgErrorMessage(err));
  } finally {
    await client?.end().catch(() => undefined);
  }
}

const TABLES_SQL = `
select t.table_schema as schema, t.table_name as name,
       case when t.table_type = 'VIEW' then 'view' else 'table' end as kind,
       s.n_live_tup::bigint as row_estimate
from information_schema.tables t
left join pg_stat_user_tables s on s.schemaname = t.table_schema and s.relname = t.table_name
where t.table_schema not in ('pg_catalog', 'information_schema') and t.table_schema not like 'pg_toast%'
order by t.table_schema, t.table_name`;

const COLUMNS_SQL = `
select table_schema as schema, table_name as "table", column_name as name,
       case when data_type = 'USER-DEFINED' then udt_name
            when data_type = 'ARRAY' then udt_name
            else data_type end as type,
       is_nullable = 'YES' as nullable, column_default as "default", ordinal_position
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name, ordinal_position`;

const PK_SQL = `
select kcu.table_schema as schema, kcu.table_name as "table", kcu.column_name as column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema and kcu.table_name = tc.table_name
where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema not in ('pg_catalog', 'information_schema')
order by kcu.ordinal_position`;

const FK_SQL = `
select tc.table_schema as schema, tc.table_name as "table", kcu.column_name as column,
       ccu.table_schema as ref_schema, ccu.table_name as ref_table, ccu.column_name as ref_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema not in ('pg_catalog', 'information_schema')`;

export async function inspectSchema(conn: Conn): Promise<{ tables: TableInfo[]; schemas: string[] }> {
  return withClient(conn, async (client) => {
    await client.query("begin read only");
    try {
      const [tables, columns, pks, fks] = await Promise.all([
        client.query<{ schema: string; name: string; kind: "table" | "view"; row_estimate: string | null }>(TABLES_SQL),
        client.query<{ schema: string; table: string; name: string; type: string; nullable: boolean; default: string | null }>(COLUMNS_SQL),
        client.query<{ schema: string; table: string; column: string }>(PK_SQL),
        client.query<{ schema: string; table: string; column: string; ref_schema: string; ref_table: string; ref_column: string }>(FK_SQL),
      ]);
      const key = (s: string, t: string) => `${s}.${t}`;
      const pkMap = new Map<string, Set<string>>();
      for (const r of pks.rows) {
        const k = key(r.schema, r.table);
        if (!pkMap.has(k)) pkMap.set(k, new Set());
        pkMap.get(k)!.add(r.column);
      }
      const fkMap = new Map<string, ColumnInfo["foreignKey"]>();
      for (const r of fks.rows) {
        fkMap.set(`${key(r.schema, r.table)}.${r.column}`, { table: r.ref_schema === "public" ? r.ref_table : `${r.ref_schema}.${r.ref_table}`, column: r.ref_column });
      }
      const colMap = new Map<string, ColumnInfo[]>();
      for (const c of columns.rows) {
        const k = key(c.schema, c.table);
        if (!colMap.has(k)) colMap.set(k, []);
        colMap.get(k)!.push({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          default: c.default,
          isPrimaryKey: pkMap.get(k)?.has(c.name) ?? false,
          foreignKey: fkMap.get(`${k}.${c.name}`) ?? null,
        });
      }
      const out: TableInfo[] = tables.rows.map((t) => ({
        schema: t.schema,
        name: t.name,
        kind: t.kind,
        rowEstimate: t.row_estimate === null || t.row_estimate === undefined ? null : Number(t.row_estimate),
        columns: colMap.get(key(t.schema, t.name)) ?? [],
        primaryKey: [...(pkMap.get(key(t.schema, t.name)) ?? [])],
      }));
      const schemas = [...new Set(out.map((t) => t.schema))];
      return { tables: out, schemas };
    } finally {
      await client.query("rollback").catch(() => undefined);
    }
  });
}

type PgResultLike = { rows: Record<string, unknown>[]; fields: FieldDef[]; rowCount: number | null; command: string };

/**
 * Run user SQL. Read-only statements execute inside a READ ONLY transaction; writes run in a
 * normal transaction (all-or-nothing). Destructive statements require `confirmDestructive`.
 */
export async function runQuery(conn: Conn, sql: string, opts: { confirmDestructive?: boolean; rowLimit?: number } = {}): Promise<QueryResultDto> {
  const text = sql.trim();
  if (!text) throw new DatabaseQueryError("SQL is empty", "bad_request");
  const analysis = analyzeSql(text);
  if (!analysis.statements.length) throw new DatabaseQueryError("No SQL statement found", "bad_request");
  if (analysis.destructive && !opts.confirmDestructive) throw new ConfirmationRequiredError(analysis.reasons);
  const limit = opts.rowLimit ?? QUERY_ROW_LIMIT;
  return withClient(conn, async (client) => {
    const started = Date.now();
    await client.query(analysis.readOnly ? "begin read only" : "begin");
    await client.query(`set local statement_timeout = ${PG_STATEMENT_TIMEOUT_MS}`);
    try {
      const raw = (await client.query(text)) as unknown as PgResultLike | PgResultLike[];
      const results = Array.isArray(raw) ? raw : [raw];
      await client.query("commit");
      const durationMs = Date.now() - started;
      const withRows = [...results].reverse().find((r) => r.fields && r.fields.length > 0) ?? results[results.length - 1];
      const rows = (withRows?.rows ?? []).slice(0, limit);
      return {
        rows,
        fields: (withRows?.fields ?? []).map((f) => ({ name: f.name, dataTypeId: f.dataTypeID })),
        rowCount: withRows?.rowCount ?? rows.length,
        durationMs,
        command: withRows?.command ?? null,
        truncated: (withRows?.rows?.length ?? 0) > limit,
        readOnly: analysis.readOnly,
      };
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw new DatabaseQueryError(pgErrorMessage(err));
    }
  });
}

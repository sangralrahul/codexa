/**
 * Conservative SQL safety classifier used before running user queries against a
 * connected database. It is intentionally simple: a tokenizer that strips
 * comments and string literals, then keyword rules. False positives (asking for
 * confirmation when not strictly needed) are acceptable; false negatives are not.
 */

export type SqlStatementKind = "read" | "write" | "destructive" | "unknown";

export type SqlAnalysis = {
  /** Individual statements found (empty when the input is blank). */
  statements: { kind: SqlStatementKind; firstKeyword: string; reason?: string }[];
  /** True when every statement is read-only (SELECT/WITH/EXPLAIN/SHOW/VALUES/TABLE). */
  readOnly: boolean;
  /** True when at least one statement is destructive and needs explicit confirmation. */
  destructive: boolean;
  /** Human readable reasons for the destructive classification. */
  reasons: string[];
};

const READ_KEYWORDS = new Set(["SELECT", "WITH", "EXPLAIN", "SHOW", "VALUES", "TABLE"]);
const ALWAYS_DESTRUCTIVE = new Set(["DROP", "TRUNCATE", "ALTER"]);
/** Tokens that precede UPDATE/DELETE when they are not a statement verb (FOR UPDATE, ON DELETE CASCADE, DO UPDATE). */
const NON_VERB_PRECEDERS = new Set(["FOR", "ON", "DO", "KEY", "NO", "ROW", "SHARE"]);

/** Strip comments and string literals; returns statements as arrays of upper-cased word tokens. */
export function tokenizeSql(sql: string): string[][] {
  const statements: string[][] = [];
  let current: string[] = [];
  let word = "";
  const flushWord = () => {
    if (word) current.push(word.toUpperCase());
    word = "";
  };
  const flushStatement = () => {
    flushWord();
    if (current.length) statements.push(current);
    current = [];
  };
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    // line comment
    if (ch === "-" && next === "-") {
      flushWord();
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    // block comment (nested allowed in Postgres)
    if (ch === "/" && next === "*") {
      flushWord();
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else i++;
      }
      continue;
    }
    // string literal
    if (ch === "'") {
      flushWord();
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") break;
        i++;
      }
      i++;
      current.push("'STR'");
      continue;
    }
    // dollar-quoted string $tag$ ... $tag$
    if (ch === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        flushWord();
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? n : end + tag.length;
        current.push("'STR'");
        continue;
      }
    }
    // quoted identifier
    if (ch === '"') {
      flushWord();
      i++;
      while (i < n && sql[i] !== '"') i++;
      i++;
      current.push('"IDENT"');
      continue;
    }
    if (ch === ";") {
      flushStatement();
      i++;
      continue;
    }
    if (/[A-Za-z0-9_]/.test(ch)) {
      word += ch;
      i++;
      continue;
    }
    // punctuation / whitespace
    flushWord();
    if (ch === "(" || ch === ")") current.push(ch);
    i++;
  }
  flushStatement();
  return statements;
}

function classifyStatement(tokens: string[]): SqlAnalysis["statements"][number] {
  const first = tokens[0] ?? "";
  if (ALWAYS_DESTRUCTIVE.has(first)) {
    return { kind: "destructive", firstKeyword: first, reason: `${first} statements are irreversible` };
  }
  // Scan the whole statement for destructive verbs (covers CTEs like WITH d AS (DELETE ...)).
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    if (t === "DROP" || t === "TRUNCATE") {
      return { kind: "destructive", firstKeyword: first, reason: `${t} statements are irreversible` };
    }
    if (t === "ALTER" && prev !== "ON") {
      return { kind: "destructive", firstKeyword: first, reason: "ALTER changes the schema" };
    }
    if ((t === "DELETE" || t === "UPDATE") && !NON_VERB_PRECEDERS.has(prev ?? "")) {
      const rest = tokens.slice(i + 1);
      const hasWhere = rest.includes("WHERE");
      if (!hasWhere) {
        return { kind: "destructive", firstKeyword: first, reason: `${t} without a WHERE clause affects every row` };
      }
    }
  }
  if (READ_KEYWORDS.has(first)) return { kind: "read", firstKeyword: first };
  if (["INSERT", "UPDATE", "DELETE", "MERGE", "CREATE", "GRANT", "REVOKE", "COMMENT", "SET", "BEGIN", "COMMIT", "ROLLBACK", "COPY", "VACUUM", "ANALYZE", "REINDEX", "CLUSTER", "LOCK", "CALL", "REFRESH", "SECURITY", "NOTIFY", "LISTEN", "PREPARE", "EXECUTE", "DEALLOCATE", "DECLARE", "FETCH", "CLOSE", "DISCARD", "RESET", "SAVEPOINT", "RELEASE", "IMPORT", "LOAD", "CHECKPOINT"].includes(first)) {
    return { kind: "write", firstKeyword: first };
  }
  return { kind: "unknown", firstKeyword: first };
}

export function analyzeSql(sql: string): SqlAnalysis {
  const statements = tokenizeSql(sql).map(classifyStatement);
  const destructiveOnes = statements.filter((s) => s.kind === "destructive");
  return {
    statements,
    readOnly: statements.length > 0 && statements.every((s) => s.kind === "read"),
    destructive: destructiveOnes.length > 0,
    reasons: destructiveOnes.map((s) => s.reason ?? "destructive statement"),
  };
}

/**
 * Tiny regex tokenizer for product depictions (no runtime highlighter). Pure and
 * server-safe: run it in a server component and pass the tokens down (compact JSON).
 * Colours come from the --syn-* tokens via <CodeLines>.
 */
export type TokenKind = "keyword" | "string" | "fn" | "tag" | "number" | "comment" | "attr" | "type" | "punct" | "plain";
export type Token = { k: TokenKind; v: string };
export type CodeLang = "tsx" | "ts" | "js" | "html" | "css" | "json" | "sql";

const JS_KEYWORDS = new Set(
  "import export from default function return const let var if else for while do switch case break continue new class extends implements interface type enum as async await try catch finally throw typeof instanceof in of void delete yield this super null undefined true false declare readonly public private protected static get set satisfies keyof infer".split(
    " ",
  ),
);
const SQL_KEYWORDS = new Set(
  "select from where and or not insert into values update set delete create table alter drop index on join left right inner outer full cross group by order having limit offset as distinct union all exists in is null like ilike between case when then else end primary key references foreign unique default returning with asc desc begin commit rollback cascade if constraint check text integer int bigint boolean varchar timestamp date numeric serial uuid true false count sum avg min max coalesce now".split(
    " ",
  ),
);

type Rule = [RegExp, TokenKind | ((m: string, ctx: Ctx) => TokenKind)];
type Ctx = { inTag: boolean; expectTag: boolean; next: string };

const sticky = (re: RegExp) => new RegExp(re.source, re.flags.includes("y") ? re.flags : re.flags + "y");

const JS_RULES: Rule[] = [
  [/\/\/[^\n]*/, "comment"],
  [/\/\*[\s\S]*?(?:\*\/|$)/, "comment"],
  [/`(?:\\[\s\S]|[^`\\])*`?/, "string"],
  [/"(?:\\.|[^"\\\n])*"?/, "string"],
  [/'(?:\\.|[^'\\\n])*'?/, "string"],
  [/<\/?(?=[A-Za-z])/, (_m, ctx) => ((ctx.expectTag = true), (ctx.inTag = true), "punct")],
  [/\/?>/, (_m, ctx) => ((ctx.inTag = false), "punct")],
  [/\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?\b/i, "number"],
  [
    /[A-Za-z_$][\w$-]*/,
    (m, ctx) => {
      if (ctx.expectTag) {
        ctx.expectTag = false;
        return "tag";
      }
      if (ctx.inTag && ctx.next === "=") return "attr";
      if (m.includes("-")) return "plain";
      if (JS_KEYWORDS.has(m)) return "keyword";
      if (ctx.next === "(") return "fn";
      if (/^[A-Z]/.test(m)) return "type";
      return "plain";
    },
  ],
  [/[{}()[\];,.<>=+\-*/!?:&|%^~@#]+/, "punct"],
  [/\s+/, "plain"],
  [/[\s\S]/, "plain"],
];

const HTML_RULES: Rule[] = [
  [/<!--[\s\S]*?(?:-->|$)/, "comment"],
  [/<!?\/?(?=[A-Za-z])/, (_m, ctx) => ((ctx.expectTag = true), (ctx.inTag = true), "punct")],
  [/\/?>/, (_m, ctx) => ((ctx.inTag = false), "punct")],
  [/"(?:[^"\n])*"?|'(?:[^'\n])*'?/, (_m, ctx) => (ctx.inTag ? "string" : "plain")],
  [
    /[A-Za-z_][\w:.-]*/,
    (_m, ctx) => {
      if (ctx.expectTag) {
        ctx.expectTag = false;
        return "tag";
      }
      return ctx.inTag ? "attr" : "plain";
    },
  ],
  [/=/, "punct"],
  [/\s+/, "plain"],
  [/[^<\s"'=>]+/, "plain"],
  [/[\s\S]/, "plain"],
];

const CSS_RULES: Rule[] = [
  [/\/\*[\s\S]*?(?:\*\/|$)/, "comment"],
  [/"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/, "string"],
  [/@[\w-]+/, "keyword"],
  [/#[0-9a-fA-F]{3,8}\b/, "number"],
  [/-?\d*\.?\d+(?:px|rem|em|%|vh|vw|svh|dvh|ms|s|deg|fr|ch)?\b/, "number"],
  [/--[\w-]+/, "attr"],
  [/[.#][A-Za-z_][\w-]*/, "tag"],
  [/[A-Za-z-]+(?=\s*:(?!:))/, (_m, ctx) => (ctx.inTag ? "attr" : "tag")],
  [/[A-Za-z_][\w-]*(?=\()/, "fn"],
  [/\{/, (_m, ctx) => ((ctx.inTag = true), "punct")],
  [/\}/, (_m, ctx) => ((ctx.inTag = false), "punct")],
  [/[A-Za-z_][\w-]*/, (_m, ctx) => (ctx.inTag ? "plain" : "tag")],
  [/[;:,()>+~*[\]=]/, "punct"],
  [/\s+/, "plain"],
  [/[\s\S]/, "plain"],
];

const JSON_RULES: Rule[] = [
  [/"(?:\\.|[^"\\\n])*"(?=\s*:)/, "attr"],
  [/"(?:\\.|[^"\\\n])*"?/, "string"],
  [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
  [/\b(?:true|false|null)\b/, "keyword"],
  [/[{}[\],:]/, "punct"],
  [/\s+/, "plain"],
  [/[\s\S]/, "plain"],
];

const SQL_RULES: Rule[] = [
  [/--[^\n]*/, "comment"],
  [/\/\*[\s\S]*?(?:\*\/|$)/, "comment"],
  [/'(?:''|[^'\n])*'?/, "string"],
  [/"(?:[^"\n])*"?/, "attr"],
  [/\b\d+(?:\.\d+)?\b/, "number"],
  [/[A-Za-z_][\w$]*/, (m, ctx) => (SQL_KEYWORDS.has(m.toLowerCase()) ? (ctx.next === "(" && !/^(in|exists|values)$/i.test(m) ? "fn" : "keyword") : ctx.next === "(" ? "fn" : "plain")],
  [/[(),;.*=<>!+\-/%]+/, "punct"],
  [/\s+/, "plain"],
  [/[\s\S]/, "plain"],
];

const RULES: Record<CodeLang, Rule[]> = { tsx: JS_RULES, ts: JS_RULES, js: JS_RULES, html: HTML_RULES, css: CSS_RULES, json: JSON_RULES, sql: SQL_RULES };
const COMPILED = new Map<CodeLang, [RegExp, Rule[1]][]>();

function compiled(lang: CodeLang) {
  let c = COMPILED.get(lang);
  if (!c) {
    c = RULES[lang].map(([re, kind]) => [sticky(re), kind] as [RegExp, Rule[1]]);
    COMPILED.set(lang, c);
  }
  return c;
}

/** Next non-space character after `i`. */
function peek(code: string, i: number) {
  for (let j = i; j < code.length; j++) {
    const ch = code[j];
    if (ch !== " " && ch !== "\t") return ch;
  }
  return "";
}

/** Tokenizes `code` and splits it into lines of tokens (adjacent same-kind tokens merged). */
export function tokenize(code: string, lang: CodeLang = "tsx"): Token[][] {
  const rules = compiled(RULES[lang] ? lang : "tsx");
  const ctx: Ctx = { inTag: false, expectTag: false, next: "" };
  const flat: Token[] = [];
  let i = 0;
  const src = code.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  while (i < src.length) {
    let matched = false;
    for (const [re, kind] of rules) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (!m || m[0].length === 0) continue;
      ctx.next = peek(src, i + m[0].length);
      const k = typeof kind === "function" ? kind(m[0], ctx) : kind;
      flat.push({ k, v: m[0] });
      i += m[0].length;
      matched = true;
      break;
    }
    if (!matched) {
      flat.push({ k: "plain", v: src[i] });
      i++;
    }
  }
  // Split on newlines, merging neighbours of the same kind to keep the payload small.
  const lines: Token[][] = [[]];
  for (const tok of flat) {
    const parts = tok.v.split("\n");
    parts.forEach((part, pi) => {
      if (pi > 0) lines.push([]);
      if (!part) return;
      const line = lines[lines.length - 1];
      const last = line[line.length - 1];
      const kind: TokenKind = /^\s+$/.test(part) ? "plain" : tok.k;
      if (last && last.k === kind) last.v += part;
      else line.push({ k: kind, v: part });
    });
  }
  return lines;
}

/** Picks a tokenizer language from a file path ("src/App.tsx" → "tsx"). */
export function langFromPath(path: string): CodeLang {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "tsx" || ext === "jsx") return "tsx";
  if (ext === "ts" || ext === "mts" || ext === "cts") return "ts";
  if (ext === "js" || ext === "mjs" || ext === "cjs") return "js";
  if (ext === "html" || ext === "htm" || ext === "svg") return "html";
  if (ext === "css" || ext === "scss") return "css";
  if (ext === "json") return "json";
  if (ext === "sql") return "sql";
  return "ts";
}

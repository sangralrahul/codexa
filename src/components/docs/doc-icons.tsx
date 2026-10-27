import { createElement } from "react";
import {
  BookOpen,
  Bot,
  Boxes,
  Code2,
  CreditCard,
  Database,
  FileCode2,
  FolderGit2,
  GitBranch,
  Globe,
  GraduationCap,
  Hammer,
  KeyRound,
  LifeBuoy,
  MessageSquareText,
  Plug,
  Rocket,
  Ship,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Variable,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons for documentation pages and categories, keyed by slug and category name. Content
 * frontmatter has no icon field (its schema is strict and owned by the content pipeline), so the
 * mapping lives here; unknown slugs fall back to their category's icon, then to a book.
 */
const BY_SLUG: Record<string, LucideIcon> = {
  "getting-started": Rocket,
  quickstart: Zap,
  prompting: MessageSquareText,
  projects: FolderGit2,
  editor: Code2,
  "ai-agent": Bot,
  databases: Database,
  authentication: KeyRound,
  integrations: Plug,
  "environment-variables": Variable,
  deployment: Ship,
  "custom-domains": Globe,
  github: GitBranch,
  billing: CreditCard,
  security: ShieldCheck,
  troubleshooting: LifeBuoy,
  account: UserRound,
  "ai-limits": Sparkles,
  "contacting-support": LifeBuoy,
  "data-export-and-deletion": Boxes,
  deployments: Ship,
  previews: Globe,
  teams: Users,
};

const BY_CATEGORY: Record<string, LucideIcon> = {
  "Start here": Rocket,
  Build: Hammer,
  Ship: Ship,
  Account: UserRound,
  Building: Hammer,
  Shipping: Ship,
  "Getting started": Rocket,
  Projects: FolderGit2,
  Data: Database,
  Frontend: FileCode2,
  Agent: Bot,
  "HTTP API": Code2,
  Developers: Wrench,
  Tools: Wrench,
  Learn: GraduationCap,
};

export function docIcon(slugOrHref: string, category?: string): LucideIcon {
  const slug = slugOrHref.split("/").filter(Boolean).pop() ?? slugOrHref;
  return BY_SLUG[slug] ?? (category ? BY_CATEGORY[category] : undefined) ?? BookOpen;
}

export function categoryIcon(category: string): LucideIcon {
  return BY_CATEGORY[category] ?? BookOpen;
}

/** A small icon tile (token colours) for index lists and the sidebar. */
export function DocIcon({ href, category, className, size = "md" }: { href: string; category?: string; className?: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "grid shrink-0 place-items-center border border-border bg-surface text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-colors duration-(--dur-3) group-hover:border-border-strong group-hover:text-foreground",
        size === "sm" ? "size-7 rounded-[8px] [&_svg]:size-3.5" : "size-9 rounded-[10px] [&_svg]:size-4",
        className ?? "",
      ].join(" ")}
    >
      {createElement(docIcon(href, category))}
    </span>
  );
}

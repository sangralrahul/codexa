import { Cloud, CreditCard, Database, GitBranch, HardDrive, KeyRound, LineChart, Mail, Sparkles, SquareKanban, type LucideIcon } from "lucide-react";
import { BrandMark, hasBrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

/** Neutral glyph per category, for available adapters that have no brand mark in the icon set. */
const CATEGORY_GLYPH: Record<string, LucideIcon> = {
  ai: Sparkles,
  databases: Database,
  payments: CreditCard,
  email: Mail,
  hosting: Cloud,
  git: GitBranch,
  storage: HardDrive,
  analytics: LineChart,
  authentication: KeyRound,
  productivity: SquareKanban,
};

/**
 * Some marks fill less of their 24px box than others (the PostgreSQL elephant is drawn small and
 * detailed); scale them so every mark reads at the same optical size.
 */
const OPTICAL_SCALE: Record<string, string> = { postgres: "scale-[1.22]" };

/**
 * Mark for an integration inside a tile. Three looks keep "available" and "planned" apart:
 * - available with a brand mark: the real mark in its official colour (nominative use);
 * - available without one (e.g. OpenAI): a neutral full-opacity category glyph, never a letter;
 * - planned: a plain letter at half opacity.
 * Decorative: the name is always written next to it (or in the tile's label).
 */
export function IntegrationMark({ id, name, category, planned = false, className }: { id: string; name: string; category?: string; planned?: boolean; className?: string }) {
  if (!planned && hasBrandMark(id)) return <BrandMark id={id} tone="color" className={cn(OPTICAL_SCALE[id], className)} />;
  if (!planned) {
    const Glyph = (category && CATEGORY_GLYPH[category]) || Sparkles;
    return <Glyph aria-hidden="true" strokeWidth={2} className={cn("size-5 shrink-0", className)} />;
  }
  const letter = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center opacity-50 [container-type:size]", className)}>
      <span className="font-display text-[80cqh] font-bold leading-none tracking-tight">{letter}</span>
    </span>
  );
}

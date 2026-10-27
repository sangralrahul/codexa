import { BrandMark, hasBrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Mark for an integration inside a tile. Real brand marks are drawn only for available adapters
 * that have one (nominative use); everything else, including every planned integration, gets a
 * plain letter, at half opacity when planned. Decorative: the name is always written next to it.
 */
export function IntegrationMark({ id, name, planned = false, className }: { id: string; name: string; planned?: boolean; className?: string }) {
  if (!planned && hasBrandMark(id)) return <BrandMark id={id} className={className} />;
  const letter = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center [container-type:size]", planned && "opacity-50", className)}>
      <span className="font-display text-[80cqh] font-bold leading-none tracking-tight">{letter}</span>
    </span>
  );
}

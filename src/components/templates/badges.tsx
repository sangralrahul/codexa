import { Badge } from "@/components/ui/badge";
import type { TemplateDifficulty } from "@/templates";

const difficultyVariant: Record<TemplateDifficulty, "success" | "warning" | "danger"> = { beginner: "success", intermediate: "warning", advanced: "danger" };

export function DifficultyBadge({ level }: { level: TemplateDifficulty }) {
  return (
    <Badge variant={difficultyVariant[level]} className="capitalize">
      <span className="sr-only">Difficulty: </span>
      {level}
    </Badge>
  );
}

export function FrameworkBadge({ name }: { name: string }) {
  return (
    <Badge variant="primary">
      <span className="sr-only">Framework: </span>
      {name}
    </Badge>
  );
}

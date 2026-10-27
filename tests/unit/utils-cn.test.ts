import { describe, expect, it } from "vitest";
import { cn, TYPE_SCALE_UTILITIES } from "@/lib/utils";

describe("cn() and the design-system type utilities", () => {
  it("keeps a type utility next to a text colour (they are font sizes, not colours)", () => {
    for (const t of TYPE_SCALE_UTILITIES) {
      expect(cn(`text-${t}`, "text-muted-foreground")).toBe(`text-${t} text-muted-foreground`);
      expect(cn("text-foreground", `text-${t}`)).toBe(`text-foreground text-${t}`);
    }
    expect(cn("text-label text-foreground-dim", "hover:text-foreground")).toBe("text-label text-foreground-dim hover:text-foreground");
  });

  it("still merges sizes with sizes and colours with colours", () => {
    expect(cn("text-title", "text-sm")).toBe("text-sm");
    expect(cn("text-sm", "text-display-2")).toBe("text-display-2");
    expect(cn("text-dim", "text-muted-foreground")).toBe("text-muted-foreground");
    expect(cn("md:text-display-2 text-display-1", "md:text-display-3")).toBe("text-display-1 md:text-display-3");
  });
});

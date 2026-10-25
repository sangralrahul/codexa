import { INTEGRATION_CATEGORIES, INTEGRATIONS, type IntegrationCategory, type IntegrationDefinition } from "@/config/integrations";

export type IntegrationStatusFilter = "all" | "available" | "planned";
export type IntegrationSearch = { q: string; category: IntegrationCategory | "all"; status: IntegrationStatusFilter };

export function isIntegrationCategory(value: string): value is IntegrationCategory {
  return INTEGRATION_CATEGORIES.some((c) => c.id === value);
}

/** Parse untrusted query-string values into an IntegrationSearch, ignoring unknown values. */
export function parseIntegrationSearch(input: { q?: string | null; category?: string | null; status?: string | null }): IntegrationSearch {
  return {
    q: (input.q ?? "").slice(0, 100),
    category: input.category && isIntegrationCategory(input.category) ? input.category : "all",
    status: input.status === "available" || input.status === "planned" ? input.status : "all",
  };
}

/** Filter the directory. Available integrations sort first, then alphabetical. */
export function searchIntegrations(opts: Partial<IntegrationSearch> = {}): IntegrationDefinition[] {
  let list = INTEGRATIONS.slice();
  if (opts.category && opts.category !== "all") list = list.filter((i) => i.category === opts.category);
  if (opts.status && opts.status !== "all") list = list.filter((i) => i.status === opts.status);
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    list = list.filter((i) => [i.name, i.id, i.description, i.category, ...(i.tags ?? []), ...i.capabilities].some((s) => s.toLowerCase().includes(q)));
  }
  return list.sort((a, b) => Number(a.status === "planned") - Number(b.status === "planned") || a.name.localeCompare(b.name));
}

export function categoryName(id: IntegrationCategory) {
  return INTEGRATION_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

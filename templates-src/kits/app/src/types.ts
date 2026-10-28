/** The shape of src/app.ts: the record type, its fields, statuses and sample data live there. */
import type { IconName } from "../../shared/Icon";

export type Tone = "good" | "warn" | "bad" | "neutral" | "accent";

export type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "money" | "date" | "select" | "email" | "longtext";
  options?: string[];
  required?: boolean;
  /** Leave the column out of the table (still shown in the form). */
  hideInTable?: boolean;
};

export type Value = string | number;
export type Row = Record<string, Value> & { id: string };

export type AppSpec = {
  brand: string;
  icon: IconName;
  /** Bump when the seed data changes so browsers reload it. */
  storageKey: string;
  entity: { singular: string; plural: string };
  title: string;
  subtitle: string;
  currency?: string;
  fields: Field[];
  /** Field shown in bold as the record's name. */
  titleKey: string;
  /** A select field used for the filter, pills and board columns. */
  statusKey: string;
  tones: Record<string, Tone>;
  summary: { label: string; kind: "count" | "sum"; field?: string; status?: string }[];
  views: ("table" | "board")[];
  seed: Record<string, Value>[];
};

/** The shape of src/dashboard.ts: every label, number and row on this dashboard lives there. */
import type { IconName } from "../../shared/Icon";

export type Tone = "good" | "warn" | "bad" | "neutral" | "accent";

export type Dashboard = {
  brand: string;
  user: { name: string; role: string };
  nav: { label: string; icon: IconName; href: string }[];
  title: string;
  subtitle: string;
  /** Each range shows the last `points` values of the chart. */
  ranges: { label: string; points: number }[];
  kpis: { label: string; value: string; delta: string; up: boolean; /** Whether going up is good (default true). */ upIsGood?: boolean }[];
  chart: { title: string; type: "line" | "bar"; unit?: string; labels: string[]; series: { name: string; values: number[] }[] };
  side: { title: string; items: { label: string; value: string; pct: number }[] };
  table: { title: string; columns: string[]; rows: string[][]; /** Index of the column rendered as a status pill. */ statusColumn?: number; tones?: Record<string, Tone> };
  feed?: { title: string; items: { text: string; time: string }[] };
};

/**
 * Locale/currency/time formatting helpers. Internationalization-ready: all
 * user-facing numbers and dates go through these so locale and timezone come
 * from the user profile rather than being hard-coded.
 */
import type { Currency } from "@/db/schema";

export type FormatContext = { locale?: string; timezone?: string };

const defaultLocaleFor = (currency?: Currency) => (currency === "INR" ? "en-IN" : "en-US");

export function formatMoney(minor: number, currency: Currency, ctx: FormatContext = {}): string {
  return new Intl.NumberFormat(ctx.locale ?? defaultLocaleFor(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function formatNumber(n: number, ctx: FormatContext = {}): string {
  return new Intl.NumberFormat(ctx.locale ?? "en-US").format(n);
}

export function formatCompact(n: number, ctx: FormatContext = {}): string {
  return new Intl.NumberFormat(ctx.locale ?? "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(d: Date | string, ctx: FormatContext = {}, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(ctx.locale ?? "en-US", { timeZone: ctx.timezone ?? "UTC", ...opts }).format(date);
}

export function formatDateTime(d: Date | string, ctx: FormatContext = {}): string {
  return formatDate(d, ctx, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(d: Date | string, now = new Date(), ctx: FormatContext = {}): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (date.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(ctx.locale ?? "en-US", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

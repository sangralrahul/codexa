/** Time-zone helpers shared by server and client settings components. */

/** "GMT+5:30" for a time zone (empty when the runtime cannot tell). */
export function utcOffset(tz: string, now = new Date()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** "4:12 PM" (or "4:12:09 PM") in `tz`; an em dash for an unknown zone. */
export function timeIn(tz: string, now = new Date(), withSeconds = false) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", second: withSeconds ? "2-digit" : undefined }).format(now);
  } catch {
    return "—";
  }
}

/** Minutes east of UTC for `tz` right now (for sorting zones by offset). */
export function offsetMinutes(tz: string, now = new Date()) {
  const label = utcOffset(tz, now);
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(label);
  if (!m) return 0;
  const v = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -v : v;
}

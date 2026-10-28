/** A small line-icon set (24px grid, 1.75 stroke). Add a name and a path to extend it. */
const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  pin: "M12 21s7-6.1 7-11.5A7 7 0 005 9.5C5 14.9 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  shield: "M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6z",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  heart: "M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0112 7.3a4.4 4.4 0 017.5 2.6C19.5 15.4 12 20 12 20z",
  leaf: "M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c3-4 6-6 9-7",
  cup: "M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5zM17 10h1.5a2.5 2.5 0 010 5H17M8 3v2M12 3v2",
  code: "M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16",
  users: "M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.5-3.4M15.5 4.2a3.5 3.5 0 010 6.6",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3",
  truck: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17.5 19a2 2 0 100-4 2 2 0 000 4z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M19 19v2H6",
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  sun: "M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  wrench: "M14.5 6.5a4 4 0 015 5L21 13l-3 3-1.5-1.5a4 4 0 01-5-5L3 18l3 3 8.5-8.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

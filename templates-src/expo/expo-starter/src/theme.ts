/** Colours, spacing and radii used across the app. Change the accent here to rebrand it. */
export const colors = {
  background: "#f7f7f5",
  surface: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  accent: "#1d4ed8",
  accentSoft: "#e8eefc",
  success: "#047857",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  title: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5, color: colors.text },
  heading: { fontSize: 17, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontSize: 13, color: colors.muted },
};

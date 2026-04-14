/* ═══════════════════════════════════════════════════════════════════
   Application-wide constants.
   Single source of truth for categories, chart colors, and config.
   ═══════════════════════════════════════════════════════════════════ */

export const CATEGORIES = [
  "salary",
  "freelance",
  "rent",
  "utilities",
  "groceries",
  "transport",
  "dining",
  "subscriptions",
  "health",
  "shopping",
  "entertainment",
  "education",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** One color per category — used in pie/bar charts and badges */
export const CATEGORY_COLORS: Record<string, string> = {
  salary: "#059669",
  freelance: "#2563EB",
  rent: "#DC2626",
  utilities: "#D97706",
  groceries: "#7C3AED",
  transport: "#0891B2",
  dining: "#DB2777",
  subscriptions: "#65A30D",
  health: "#EA580C",
  shopping: "#4F46E5",
  entertainment: "#0D9488",
  education: "#CA8A04",
  other: "#6B7280",
};

/** Fallback ordered palette for charts when category isn't matched */
export const CHART_COLORS = [
  "#059669", "#2563EB", "#DC2626", "#D97706", "#7C3AED",
  "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#4F46E5",
  "#0D9488", "#CA8A04", "#6B7280",
];

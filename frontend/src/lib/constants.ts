export const CATEGORIES = [
  "salary","freelance","rent","utilities","groceries","transport",
  "dining","subscriptions","health","shopping","entertainment","education","other",
] as const;

export const SOURCES = ["ING", "ABN", "CREDIT"] as const;
export type Source = (typeof SOURCES)[number];

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  salary:"#0D9488", freelance:"#4F46E5", rent:"#EF4444", utilities:"#F59E0B",
  groceries:"#8B5CF6", transport:"#0EA5E9", dining:"#EC4899", subscriptions:"#10B981",
  health:"#F97316", shopping:"#6366F1", entertainment:"#14B8A6", education:"#A855F7", other:"#64748B",
};

export const CHART_COLORS = [
  "#0D9488","#4F46E5","#EF4444","#F59E0B","#8B5CF6",
  "#0EA5E9","#EC4899","#10B981","#F97316","#6366F1",
  "#14B8A6","#A855F7","#64748B",
];

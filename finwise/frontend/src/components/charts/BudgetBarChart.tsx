"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card } from "@/components/ui";
import { formatCurrency, capitalize } from "@/lib/utils";
import type { CategorySummary } from "@/types";

export function BudgetBarChart({ data }: { data: CategorySummary[] }) {
  const chartData = data.map((c) => ({ category: capitalize(c.category), spent: Number(c.total), budget: c.budget ? Number(c.budget) : 0 }));

  return (
    <Card style={{ padding: 22 }}>
      <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Budget vs Actual</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="budget" name="Budget" fill="var(--color-surface-alt)" radius={[5, 5, 0, 0]} />
            <Bar dataKey="spent" name="Spent" fill="var(--color-teal)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>No budget data</div>
      )}
    </Card>
  );
}

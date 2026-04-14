"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { Card } from "@/components/ui";
import { formatCurrency, capitalize } from "@/lib/utils";
import type { CategorySummary } from "@/types";
import styles from "./BudgetBarChart.module.css";

interface BudgetBarChartProps {
  data: CategorySummary[];
}

export function BudgetBarChart({ data }: BudgetBarChartProps) {
  const chartData = data.map((c) => ({
    category: capitalize(c.category),
    spent: Number(c.total),
    budget: c.budget ? Number(c.budget) : 0,
  }));

  return (
    <Card className={styles.wrapper}>
      <h3 className={styles.title}>Budget vs Spending</h3>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-light)"
              vertical={false}
            />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="budget" name="Budget" fill="var(--color-accent-light)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spent" name="Spent" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className={styles.empty}>No budget data</div>
      )}
    </Card>
  );
}

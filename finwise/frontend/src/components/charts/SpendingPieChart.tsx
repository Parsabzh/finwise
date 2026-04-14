"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS, CHART_COLORS } from "@/lib/constants";
import type { CategorySummary } from "@/types";
import styles from "./SpendingPieChart.module.css";

interface SpendingPieChartProps {
  data: CategorySummary[];
}

export function SpendingPieChart({ data }: SpendingPieChartProps) {
  const chartData = data.map((c, i) => ({
    name: c.category,
    value: Number(c.total),
    fill: CATEGORY_COLORS[c.category] || CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <Card className={styles.wrapper}>
      <h3 className={styles.title}>Spending by Category</h3>

      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={55}
                strokeWidth={2}
                stroke="var(--color-surface)"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-sm)",
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className={styles.legend}>
            {chartData.map((item, i) => (
              <div key={i} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: item.fill }} />
                {item.name}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.empty}>No spending data</div>
      )}
    </Card>
  );
}

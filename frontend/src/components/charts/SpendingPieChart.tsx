"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { formatCurrency, capitalize } from "@/lib/utils";
import { CATEGORY_COLORS, CHART_COLORS } from "@/lib/constants";
import type { CategorySummary } from "@/types";
import s from "./SpendingPieChart.module.css";

export function SpendingPieChart({ data }: { data: CategorySummary[] }) {
  const chartData = data.map((c, i) => ({
    name: capitalize(c.category), value: Number(c.total),
    fill: CATEGORY_COLORS[c.category] || CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <Card className={s.wrapper}>
      <h3 className={s.title}>Spending Breakdown</h3>
      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={52} strokeWidth={2} stroke="var(--color-surface)">
                {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className={s.legend}>
            {chartData.map((item, i) => (
              <div key={i} className={s.legendItem}>
                <div className={s.legendDot} style={{ background: item.fill }} />{item.name}
              </div>
            ))}
          </div>
        </>
      ) : <div className={s.empty}>No spending data</div>}
    </Card>
  );
}

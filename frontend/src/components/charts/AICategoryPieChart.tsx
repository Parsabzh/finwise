"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { formatCurrency, capitalize } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import type { Transaction } from "@/types";
import s from "./SpendingPieChart.module.css";

export function AICategoryPieChart({ transactions }: { transactions: Transaction[] }) {
  const totals: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.ai_category || tx.category;
    totals[key] = (totals[key] || 0) + Number(tx.amount);
  }

  const chartData = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name: capitalize(name),
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

  return (
    <Card className={s.wrapper}>
      <h3 className={s.title}>AI Category Breakdown</h3>
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
      ) : <div className={s.empty}>No AI category data</div>}
    </Card>
  );
}

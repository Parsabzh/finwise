"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, PiggyBank, Tag } from "lucide-react";
import { Card, StatCard, MonthNavigator, ProgressBar, Spinner } from "@/components/ui";
import { SpendingPieChart, BudgetBarChart } from "@/components/charts";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { getTransactions, getSummary, getSavingGoals } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Transaction, SummaryResponse, SavingGoal } from "@/types";
import styles from "./Dashboard.module.css";

export function DashboardPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sum, txs, gls] = await Promise.all([
        getSummary(token, month),
        getTransactions(token, { month, limit: 5 }),
        getSavingGoals(token),
      ]);
      setSummary(sum);
      setTransactions(txs);
      setGoals(gls.slice(0, 4)); // show top 4 on dashboard
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [month, token]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loading} style={{ color: "var(--color-red)" }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Your financial overview</p>
        </div>
        <MonthNavigator month={month} onPrev={prev} onNext={next} />
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Income" value={formatCurrency(summary?.total_income)} icon={TrendingUp} color="accent" />
        <StatCard label="Total Expenses" value={formatCurrency(summary?.total_expenses)} icon={TrendingDown} color="red" />
        <StatCard
          label="Net Savings"
          value={formatCurrency(summary?.net_savings)}
          icon={PiggyBank}
          color={Number(summary?.net_savings) >= 0 ? "accent" : "red"}
        />
        <StatCard label="Categories" value={String(summary?.by_category?.length || 0)} icon={Tag} color="blue" />
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <SpendingPieChart data={summary?.by_category || []} />
        <BudgetBarChart data={summary?.by_category || []} />
      </div>

      {/* Bottom row */}
      <div className={styles.bottomGrid}>
        {/* Recent transactions */}
        <Card>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Recent Transactions</h3>
            <span className={styles.listCount}>{transactions.length} shown</span>
          </div>
          {transactions.length > 0 ? (
            <div>
              {transactions.map((tx) => (
                <div key={tx.id} className={styles.txRow}>
                  <div className={styles.txLeft}>
                    <div className={`${styles.txIcon} ${tx.type === "income" ? styles["txIcon--income"] : styles["txIcon--expense"]}`}>
                      {tx.type === "income"
                        ? <TrendingUp size={15} color="var(--color-accent)" />
                        : <TrendingDown size={15} color="var(--color-red)" />
                      }
                    </div>
                    <div>
                      <p className={styles.txDesc}>{tx.description}</p>
                      <p className={styles.txMeta}>{tx.category} · {tx.date}</p>
                    </div>
                  </div>
                  <span className={`${styles.txAmount} ${tx.type === "income" ? styles["txAmount--income"] : styles["txAmount--expense"]}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyList}>No transactions this month</div>
          )}
        </Card>

        {/* Savings goals */}
        <Card>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Savings Goals</h3>
          </div>
          {goals.length > 0 ? (
            <div className={styles.goalsWrap}>
              {goals.map((g) => {
                const pct = Number(g.target_amount) > 0
                  ? (Number(g.current_amount) / Number(g.target_amount)) * 100
                  : 0;
                return (
                  <div key={g.id} className={styles.goalRow}>
                    <div className={styles.goalTop}>
                      <span className={styles.goalName}>{g.name}</span>
                      <span className={styles.goalPct}>{Math.round(pct)}%</span>
                    </div>
                    <ProgressBar value={Number(g.current_amount)} max={Number(g.target_amount)} />
                    <div className={styles.goalBottom}>
                      <span className={styles.goalAmount}>{formatCurrency(g.current_amount)}</span>
                      <span className={styles.goalAmount}>{formatCurrency(g.target_amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyList}>No goals yet</div>
          )}
        </Card>
      </div>
    </div>
  );
}

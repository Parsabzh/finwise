"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, PiggyBank, Tag, Plus } from "lucide-react";
import { Card, StatCard, MonthNavigator, ProgressBar, Badge, Spinner, Modal, Button, Input, Select } from "@/components/ui";
import { SpendingPieChart, BudgetBarChart } from "@/components/charts";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { useCategories } from "@/hooks/useCategories";
import { getTransactions, getSummary, getSavingGoals, createTransaction } from "@/lib/api";
import { formatCurrency, capitalize, todayISO } from "@/lib/utils";
import type { Transaction, SummaryResponse, SavingGoal, TransactionCreate } from "@/types";
import s from "./Dashboard.module.css";

const EMPTY: TransactionCreate = { amount: 0, type: "expense", category: "other", description: "", date: todayISO(), source: null };

export function DashboardPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const { categories } = useCategories();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick-add state — lives on the dashboard so the user never has to navigate
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<TransactionCreate>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sum, txs, gls] = await Promise.all([
        getSummary(token, month), getTransactions(token, { month, limit: 5 }), getSavingGoals(token),
      ]);
      setSummary(sum); setTransactions(txs); setGoals(gls.slice(0, 4));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ ...EMPTY, date: todayISO() }); setShowAddModal(true); };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await createTransaction(token, form);
      setShowAddModal(false);
      load(); // refresh dashboard stats immediately after adding
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const formCategoryOptions = categories.map(c => ({ value: c, label: capitalize(c) }));

  if (loading) return <div className={s.loading}><Spinner /> Loading dashboard...</div>;

  return (
    <div>
      <div className={s.header}>
        <div><h1 className={s.title}>Dashboard</h1><p className={s.subtitle}>Your financial overview</p></div>
        <MonthNavigator month={month} onPrev={prev} onNext={next} />
      </div>

      <div className={s.statsGrid}>
        <StatCard label="Income" value={formatCurrency(summary?.total_income)} icon={TrendingUp} iconBg="var(--color-teal-light)" iconColor="var(--color-teal)" accent="var(--color-teal)" />
        <StatCard label="Expenses" value={formatCurrency(summary?.total_expenses)} icon={TrendingDown} iconBg="var(--color-coral-light)" iconColor="var(--color-coral)" accent="var(--color-coral)" />
        <StatCard label="Net Savings" value={formatCurrency(summary?.net_savings)} icon={PiggyBank} iconBg="var(--color-teal-light)" iconColor="var(--color-teal)" accent="var(--color-teal)" />
        <StatCard label="Categories" value={String(summary?.by_category?.length || 0)} icon={Tag} iconBg="var(--color-indigo-light)" iconColor="var(--color-indigo)" accent="var(--color-indigo)" />
      </div>

      <div className={s.chartsGrid}>
        <SpendingPieChart data={summary?.by_category || []} />
        <BudgetBarChart data={summary?.by_category || []} />
      </div>

      <div className={s.bottomGrid}>
        <Card>
          <div className={s.listHeader}>
            <h3 className={s.listTitle}>Recent Transactions</h3>
            <Badge variant="sky">{transactions.length} shown</Badge>
          </div>
          {transactions.length > 0 ? transactions.map((tx) => (
            <div key={tx.id} className={s.txRow}>
              <div className={s.txLeft}>
                <div className={`${s.txIcon} ${tx.type === "income" ? s["txIcon--income"] : s["txIcon--expense"]}`}>
                  {tx.type === "income" ? <TrendingUp size={15} color="var(--color-teal)" /> : <TrendingDown size={15} color="var(--color-text-tertiary)" />}
                </div>
                <div><p className={s.txDesc}>{tx.description}</p><p className={s.txMeta}>{tx.category} · {tx.date}</p></div>
              </div>
              <span className={`${s.txAmount} ${tx.type === "income" ? s["txAmount--income"] : s["txAmount--expense"]}`}>
                {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
              </span>
            </div>
          )) : <div className={s.emptyList}>No transactions this month</div>}
        </Card>

        <Card>
          <div className={s.listHeader}><h3 className={s.listTitle}>Savings Goals</h3></div>
          {goals.length > 0 ? (
            <div className={s.goalsWrap}>
              {goals.map((g) => {
                const pct = Number(g.target_amount) > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className={s.goalTop}>
                      <span className={s.goalName}>{g.name}</span>
                      <span className={s.goalPct} style={{ color: pct > 60 ? "var(--color-teal)" : "var(--color-indigo)" }}>{pct}%</span>
                    </div>
                    <ProgressBar value={Number(g.current_amount)} max={Number(g.target_amount)} color={pct > 60 ? "var(--color-teal)" : "var(--color-indigo)"} height={7} />
                    <div className={s.goalBottom}>
                      <span className={s.goalAmt}>{formatCurrency(g.current_amount)}</span>
                      <span className={s.goalAmt}>{formatCurrency(g.target_amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className={s.emptyList}>No goals yet</div>}
        </Card>
      </div>

      {/* Floating Action Button — always visible, lowest-friction way to log a transaction */}
      <button className={s.fab} onClick={openAdd} title="Add transaction">
        <Plus size={22} />
      </button>

      {/* Quick-add modal — same form as the transactions page, right here on the dashboard */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Quick Add Transaction">
        <div className={s.formGrid}>
          <Input
            label="Description"
            placeholder="e.g., Groceries at Albert Heijn"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <div className={s.formRow}>
            <Input
              label="Amount" type="number" step="0.01" min="0" placeholder="0.00"
              value={form.amount || ""}
              onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
            />
            <Select
              label="Type"
              options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]}
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as "income" | "expense" })}
            />
          </div>
          <div className={s.formRow}>
            <Select
              label="Category"
              options={formCategoryOptions}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            />
            <Input
              label="Date" type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Add Transaction</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

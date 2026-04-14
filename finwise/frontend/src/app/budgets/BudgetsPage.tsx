"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit3, Trash2, Wallet, AlertTriangle } from "lucide-react";
import {
  Card, Button, Input, Select, Modal, MonthNavigator,
  ProgressBar, EmptyState, Spinner,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { getBudgets, createBudget, updateBudget, deleteBudget, getSummary } from "@/lib/api";
import { formatCurrency, capitalize } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { Budget, SummaryResponse } from "@/types";
import styles from "./Budgets.module.css";

export function BudgetsPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({ category: "other", limit_amount: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        getBudgets(token, month),
        getSummary(token, month),
      ]);
      setBudgets(b);
      setSummary(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, token]);

  useEffect(() => { load(); }, [load]);

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    summary?.by_category?.forEach((c) => { map[c.category] = Number(c.total); });
    return map;
  }, [summary]);

  const totalBudget = budgets.reduce((s, b) => s + Number(b.limit_amount), 0);
  const totalSpent = Object.values(spendingMap).reduce((s, v) => s + v, 0);

  const openAdd = () => {
    setEditBudget(null);
    setForm({ category: "other", limit_amount: "" });
    setShowModal(true);
  };

  const openEdit = (b: Budget) => {
    setEditBudget(b);
    setForm({ category: b.category, limit_amount: String(b.limit_amount) });
    setShowModal(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const [y, m] = month.split("-");
      const body = {
        category: form.category,
        limit_amount: parseFloat(form.limit_amount),
        month: `${y}-${m}-01`,
      };
      if (editBudget) {
        await updateBudget(token, editBudget.id, body);
      } else {
        await createBudget(token, body);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!token || !confirm("Delete this budget?")) return;
    try {
      await deleteBudget(token, id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Budgets</h1>
          <p className={styles.subtitle}>Track spending limits per category</p>
        </div>
        <div className={styles.headerRight}>
          <MonthNavigator month={month} onPrev={prev} onNext={next} />
          <Button onClick={openAdd}><Plus size={16} /> Add Budget</Button>
        </div>
      </div>

      {/* Overview */}
      <Card className={styles.overview}>
        <div className={styles.overviewTop}>
          <div>
            <p className={styles.overviewLabel}>Total Budget</p>
            <p className={styles.overviewValue}>{formatCurrency(totalBudget)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className={styles.overviewLabel}>Total Spent</p>
            <p className={`${styles.overviewValue} ${totalSpent > totalBudget ? styles["overviewValue--over"] : styles["overviewValue--under"]}`}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>
        <ProgressBar
          value={totalSpent}
          max={totalBudget}
          color={totalSpent > totalBudget ? "var(--color-red)" : "var(--color-accent)"}
          height={10}
        />
        <p className={styles.overviewMeta}>
          {formatCurrency(Math.max(0, totalBudget - totalSpent))} remaining ·{" "}
          {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% used
        </p>
      </Card>

      {/* Budget cards */}
      {loading ? (
        <div className={styles.loading}><Spinner /></div>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No budgets set"
            description="Set spending limits for each category to stay on track"
            action={<Button onClick={openAdd}><Plus size={16} /> Add Budget</Button>}
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {budgets.map((b) => {
            const spent = spendingMap[b.category] || 0;
            const limit = Number(b.limit_amount);
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const isOver = spent > limit;
            const color = isOver ? "var(--color-red)" : pct > 80 ? "var(--color-amber)" : "var(--color-accent)";

            return (
              <Card key={b.id} className={styles.budgetCard}>
                <div className={styles.budgetTop}>
                  <div>
                    <p className={styles.budgetCategory}>{b.category}</p>
                    <p className={styles.budgetAmounts}>
                      {formatCurrency(spent)} of {formatCurrency(limit)}
                    </p>
                  </div>
                  <div className={styles.budgetActions}>
                    {isOver && <AlertTriangle size={16} color="var(--color-red)" style={{ marginRight: 6 }} />}
                    <button className={styles.actionBtn} onClick={() => openEdit(b)}>
                      <Edit3 size={14} />
                    </button>
                    <button className={`${styles.actionBtn} ${styles["actionBtn--delete"]}`} onClick={() => remove(b.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <ProgressBar value={spent} max={limit} color={color} />
                <div className={styles.budgetBottom}>
                  <span className={styles.budgetPct} style={{ color }}>{pct}%</span>
                  <span className={styles.budgetRemaining}>
                    {isOver ? `${formatCurrency(spent - limit)} over` : `${formatCurrency(limit - spent)} left`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editBudget ? "Edit Budget" : "Add Budget"}>
        <div className={styles.formGrid}>
          <Select
            label="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: capitalize(c) }))}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            label="Budget Limit (€)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.limit_amount}
            onChange={(e) => setForm({ ...form, limit_amount: e.target.value })}
          />
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editBudget ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Repeat, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card, Button, Input, Select, Modal, Badge, EmptyState, Spinner,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  getRecurringTransactions, createRecurringTransaction,
  updateRecurringTransaction, deleteRecurringTransaction,
} from "@/lib/api";
import { formatCurrency, capitalize, ordinal, todayISO } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { RecurringTransaction, RecurringTransactionCreate } from "@/types";
import styles from "./Recurring.module.css";

const EMPTY_FORM: RecurringTransactionCreate = {
  amount: 0, type: "expense", category: "other", description: "",
  frequency: "monthly", day_of_month: 1,
  start_date: todayISO(), end_date: null, is_active: true,
};

export function RecurringPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState<RecurringTransactionCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getRecurringTransactions(token);
      setRules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditRule(null);
    setForm({ ...EMPTY_FORM, start_date: todayISO() });
    setShowModal(true);
  };

  const openEdit = (r: RecurringTransaction) => {
    setEditRule(r);
    setForm({
      amount: Number(r.amount), type: r.type, category: r.category,
      description: r.description, frequency: r.frequency,
      day_of_month: r.day_of_month, start_date: r.start_date,
      end_date: r.end_date, is_active: r.is_active,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editRule) {
        await updateRecurringTransaction(token, editRule.id, form);
      } else {
        await createRecurringTransaction(token, form);
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
    if (!token || !confirm("Delete this recurring rule?")) return;
    try {
      await deleteRecurringTransaction(token, id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const totalMonthly = rules
    .filter((r) => r.is_active && r.frequency === "monthly")
    .reduce((s, r) => s + (r.type === "income" ? 1 : -1) * Number(r.amount), 0);

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Recurring Transactions</h1>
          <p className={styles.subtitle}>Monthly net: {formatCurrency(totalMonthly)}</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} /> Add Rule</Button>
      </div>

      {/* Rules grid */}
      {loading ? (
        <div className={styles.loading}><Spinner /></div>
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="No recurring transactions"
            description="Set up rules for regular payments like rent, salary, or subscriptions"
            action={<Button onClick={openAdd}><Plus size={16} /> Add Rule</Button>}
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {rules.map((r) => (
            <Card key={r.id} className={`${styles.ruleCard} ${!r.is_active ? styles["ruleCard--inactive"] : ""}`}>
              <div className={styles.ruleTop}>
                <div className={styles.ruleInfo}>
                  <div className={`${styles.ruleIcon} ${r.type === "income" ? styles["ruleIcon--income"] : styles["ruleIcon--expense"]}`}>
                    {r.type === "income"
                      ? <TrendingUp size={18} color="var(--color-accent)" />
                      : <TrendingDown size={18} color="var(--color-red)" />
                    }
                  </div>
                  <div>
                    <p className={styles.ruleDesc}>{r.description}</p>
                    <div className={styles.ruleBadges}>
                      <Badge color={r.type === "income" ? "green" : "red"}>{r.type}</Badge>
                      <Badge>{r.category}</Badge>
                    </div>
                  </div>
                </div>
                <div className={styles.ruleActions}>
                  <button className={styles.actionBtn} onClick={() => openEdit(r)}>
                    <Edit3 size={14} />
                  </button>
                  <button className={`${styles.actionBtn} ${styles["actionBtn--delete"]}`} onClick={() => remove(r.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className={styles.detailsGrid}>
                <div>
                  <p className={styles.detailLabel}>Amount</p>
                  <p className={`${styles.detailValue} ${r.type === "income" ? styles["detailValue--income"] : ""}`}>
                    {formatCurrency(r.amount)}
                  </p>
                </div>
                <div>
                  <p className={styles.detailLabel}>Frequency</p>
                  <p className={styles.detailValueSm}>{r.frequency}</p>
                </div>
                <div>
                  <p className={styles.detailLabel}>Day</p>
                  <p className={styles.detailValueSm}>{ordinal(r.day_of_month)}</p>
                </div>
              </div>

              {!r.is_active && (
                <div className={styles.pausedBadge}>
                  <Badge color="amber">Paused</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRule ? "Edit Recurring Rule" : "Add Recurring Rule"} maxWidth={520}>
        <div className={styles.formGrid}>
          <Input label="Description" placeholder="e.g., Monthly rent" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className={styles.formRow2}>
            <Input label="Amount" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            <Select label="Type" options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div className={styles.formRow2}>
            <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: capitalize(c) }))} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Select label="Frequency" options={[{ value: "monthly", label: "Monthly" }, { value: "weekly", label: "Weekly" }, { value: "yearly", label: "Yearly" }]} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
          </div>
          <div className={styles.formRow3}>
            <Input label="Day of Month" type="number" min={1} max={28} value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value) || 1 })} />
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} />
          </div>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" className={styles.checkbox} checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editRule ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

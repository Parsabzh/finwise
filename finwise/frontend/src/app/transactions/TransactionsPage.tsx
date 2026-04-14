"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import {
  Card, Button, Input, Select, Modal, Badge, MonthNavigator,
  EmptyState, Spinner,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
} from "@/lib/api";
import { formatCurrency, capitalize, todayISO } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { Transaction, TransactionCreate } from "@/types";
import styles from "./Transactions.module.css";

const EMPTY_FORM: TransactionCreate = {
  amount: 0,
  type: "expense",
  category: "other",
  description: "",
  date: todayISO(),
};

export function TransactionsPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactions(token, {
        month,
        category: catFilter || undefined,
        type: typeFilter || undefined,
      });
      setTxs(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [month, catFilter, typeFilter, token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTx(null);
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setShowModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setForm({
      amount: Number(tx.amount),
      type: tx.type as "income" | "expense",
      category: tx.category,
      description: tx.description,
      date: tx.date,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editTx) {
        await updateTransaction(token, editTx.id, form);
      } else {
        await createTransaction(token, form);
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
    if (!token || !confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(token, id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const net = txs.reduce(
    (s, tx) => s + (tx.type === "income" ? 1 : -1) * Number(tx.amount),
    0
  );

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...CATEGORIES.map((c) => ({ value: c, label: capitalize(c) })),
  ];

  const typeOptions = [
    { value: "", label: "All types" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
  ];

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>
            {txs.length} transactions · Net: {formatCurrency(net)}
          </p>
        </div>
        <Button onClick={openAdd}><Plus size={16} /> Add Transaction</Button>
      </div>

      {/* Filters */}
      <Card className={styles.filters}>
        <div className={styles.filtersInner}>
          <MonthNavigator month={month} onPrev={prev} onNext={next} />
          <Select options={categoryOptions} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} />
          <Select options={typeOptions} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className={styles.loading}><Spinner /></div>
        ) : error ? (
          <div className={styles.loading} style={{ color: "var(--color-red)" }}>{error}</div>
        ) : txs.length === 0 ? (
          <EmptyState
            icon={ArrowUpDown}
            title="No transactions found"
            description="Add your first transaction or adjust your filters"
            action={<Button onClick={openAdd}><Plus size={16} /> Add Transaction</Button>}
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Description</th>
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Type</th>
                  <th className={`${styles.th} ${styles["th--right"]}`}>Amount</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx.id} className={styles.tr}>
                    <td className={`${styles.td} ${styles["td--date"]}`}>{tx.date}</td>
                    <td className={`${styles.td} ${styles["td--desc"]}`}>{tx.description}</td>
                    <td className={styles.td}>
                      <Badge color={tx.type === "income" ? "green" : "gray"}>{tx.category}</Badge>
                    </td>
                    <td className={styles.td}>
                      <Badge color={tx.type === "income" ? "green" : "red"}>{tx.type}</Badge>
                    </td>
                    <td className={`${styles.td} ${styles["td--amount"]} ${tx.type === "income" ? styles["td--amount--income"] : styles["td--amount--expense"]}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </td>
                    <td className={`${styles.td} ${styles["td--actions"]}`}>
                      <div className={styles.actionsWrap}>
                        <button className={styles.actionBtn} onClick={() => openEdit(tx)}>
                          <Edit3 size={15} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles["actionBtn--delete"]}`} onClick={() => remove(tx.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTx ? "Edit Transaction" : "Add Transaction"}>
        <div className={styles.formGrid}>
          <Input
            label="Description"
            placeholder="e.g., Groceries at Albert Heijn"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className={styles.formRow}>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
            />
            <Select
              label="Type"
              options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })}
            />
          </div>
          <div className={styles.formRow}>
            <Select
              label="Category"
              options={CATEGORIES.map((c) => ({ value: c, label: capitalize(c) }))}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editTx ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

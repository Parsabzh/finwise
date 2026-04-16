"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import { Card, Button, Input, Select, Modal, Badge, MonthNavigator, EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/lib/api";
import { formatCurrency, capitalize, todayISO } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { Transaction, TransactionCreate } from "@/types";
import s from "./Transactions.module.css";

const EMPTY: TransactionCreate = { amount: 0, type: "expense", category: "other", description: "", date: todayISO() };

export function TransactionsPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionCreate>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return; setLoading(true);
    try { setTxs(await getTransactions(token, { month, category: catFilter || undefined, type: typeFilter || undefined })); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [month, catFilter, typeFilter, token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTx(null); setForm({ ...EMPTY, date: todayISO() }); setShowModal(true); };
  const openEdit = (tx: Transaction) => { setEditTx(tx); setForm({ amount: Number(tx.amount), type: tx.type as "income"|"expense", category: tx.category, description: tx.description, date: tx.date }); setShowModal(true); };

  const save = async () => {
    if (!token) return; setSaving(true);
    try { editTx ? await updateTransaction(token, editTx.id, form) : await createTransaction(token, form); setShowModal(false); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!token || !confirm("Delete this transaction?")) return;
    try { await deleteTransaction(token, id); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const net = txs.reduce((a, tx) => a + (tx.type === "income" ? 1 : -1) * Number(tx.amount), 0);

  return (
    <div>
      <div className={s.header}>
        <div><h1 className={s.title}>Transactions</h1><p className={s.subtitle}>{txs.length} transactions · Net: {formatCurrency(net)}</p></div>
        <Button onClick={openAdd}><Plus size={15} /> Add Transaction</Button>
      </div>
      <Card className={s.filters}><div className={s.filtersInner}>
        <MonthNavigator month={month} onPrev={prev} onNext={next} />
        <Select options={[{ value: "", label: "All categories" }, ...CATEGORIES.map(c => ({ value: c, label: capitalize(c) }))]} value={catFilter} onChange={e => setCatFilter(e.target.value)} />
        <Select options={[{ value: "", label: "All types" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} />
      </div></Card>
      <Card>
        {loading ? <div className={s.loading}><Spinner /></div> : txs.length === 0 ? (
          <EmptyState icon={ArrowUpDown} title="No transactions found" description="Add your first transaction or adjust filters" action={<Button onClick={openAdd}><Plus size={15} /> Add Transaction</Button>} />
        ) : (
          <div className={s.tableWrap}><table className={s.table}>
            <thead><tr>
              {["Date","Description","Category","Type","Amount",""].map((h,i) => <th key={i} className={`${s.th} ${i===4?s["th--right"]:""}`}>{h}</th>)}
            </tr></thead>
            <tbody>{txs.map(tx => (
              <tr key={tx.id} className={s.tr}>
                <td className={`${s.td} ${s["td--date"]}`}>{tx.date}</td>
                <td className={`${s.td} ${s["td--desc"]}`}>{tx.description}</td>
                <td className={s.td}><Badge variant={tx.type==="income"?"teal":"default"}>{tx.category}</Badge></td>
                <td className={s.td}><Badge variant={tx.type==="income"?"teal":"coral"}>{tx.type}</Badge></td>
                <td className={`${s.td} ${s["td--amount"]} ${tx.type==="income"?s["td--income"]:s["td--expense"]}`}>{tx.type==="income"?"+":"−"}{formatCurrency(tx.amount)}</td>
                <td className={`${s.td} ${s["td--actions"]}`}><div className={s.actionsWrap}>
                  <button className={s.actionBtn} onClick={() => openEdit(tx)}><Edit3 size={14} /></button>
                  <button className={`${s.actionBtn} ${s["actionBtn--del"]}`} onClick={() => remove(tx.id)}><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTx ? "Edit Transaction" : "Add Transaction"}>
        <div className={s.formGrid}>
          <Input label="Description" placeholder="e.g., Groceries at Albert Heijn" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className={s.formRow}>
            <Input label="Amount" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount || ""} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            <Select label="Type" options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "income"|"expense" })} />
          </div>
          <div className={s.formRow}>
            <Select label="Category" options={CATEGORIES.map(c => ({ value: c, label: capitalize(c) }))} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editTx ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

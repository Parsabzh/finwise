"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, Settings2 } from "lucide-react";
import { Card, Button, Input, Select, Modal, Badge, MonthNavigator, EmptyState, Spinner, CategoryManager } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { useCategories } from "@/hooks/useCategories";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/lib/api";
import { formatCurrency, capitalize, todayISO } from "@/lib/utils";
import type { Transaction, TransactionCreate } from "@/types";
import s from "./Transactions.module.css";

type SortDir = "asc" | "desc" | "none";
const EMPTY: TransactionCreate = { amount: 0, type: "expense", category: "other", description: "", date: todayISO() };

export function TransactionsPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const { categories } = useCategories();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showModal, setShowModal] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionCreate>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setTxs(await getTransactions(token, { month, category: catFilter || undefined, type: typeFilter || undefined }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, catFilter, typeFilter, token]);

  useEffect(() => { load(); }, [load]);

  // Client-side sort — 100-item max, no extra backend roundtrip needed
  const sorted = [...txs].sort((a, b) => {
    if (sortDir === "none") return 0;
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return sortDir === "asc" ? diff : -diff;
  });

  const cycleSortDir = () => setSortDir(d => d === "desc" ? "asc" : d === "asc" ? "none" : "desc");
  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ChevronsUpDown;

  const openAdd = () => { setEditTx(null); setForm({ ...EMPTY, date: todayISO() }); setShowModal(true); };
  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setForm({ amount: Number(tx.amount), type: tx.type as "income" | "expense", category: tx.category, description: tx.description, date: tx.date });
    setShowModal(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      editTx ? await updateTransaction(token, editTx.id, form) : await createTransaction(token, form);
      setShowModal(false);
      load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!token || !confirm("Delete this transaction?")) return;
    try { await deleteTransaction(token, id); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const net = txs.reduce((a, tx) => a + (tx.type === "income" ? 1 : -1) * Number(tx.amount), 0);
  const categoryOptions = [{ value: "", label: "All categories" }, ...categories.map(c => ({ value: c, label: capitalize(c) }))];
  const formCategoryOptions = categories.map(c => ({ value: c, label: capitalize(c) }));

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Transactions</h1>
          <p className={s.subtitle}>{txs.length} transactions · Net: {formatCurrency(net)}</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" onClick={() => setShowCatManager(true)}>
            <Settings2 size={14} /> Categories
          </Button>
          <Button onClick={openAdd}><Plus size={15} /> Add Transaction</Button>
        </div>
      </div>

      <Card className={s.filters}><div className={s.filtersInner}>
        <MonthNavigator month={month} onPrev={prev} onNext={next} />
        <Select options={categoryOptions} value={catFilter} onChange={e => setCatFilter(e.target.value)} />
        <Select options={[{ value: "", label: "All types" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} />
      </div></Card>

      <Card>
        {loading ? <div className={s.loading}><Spinner /></div> : sorted.length === 0 ? (
          <EmptyState icon={ChevronsUpDown} title="No transactions found" description="Add your first transaction or adjust filters" action={<Button onClick={openAdd}><Plus size={15} /> Add Transaction</Button>} />
        ) : (
          <div className={s.tableWrap}><table className={s.table}>
            <thead><tr>
              <th className={`${s.th} ${s["th--sortable"]}`} onClick={cycleSortDir}>
                <span className={s.sortHeader}>Date <SortIcon size={12} className={s.sortIcon} /></span>
              </th>
              {["Description", "Category", "Type", "Amount", ""].map((h, i) => (
                <th key={i} className={`${s.th} ${i === 3 ? s["th--right"] : ""}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{sorted.map(tx => (
              <tr key={tx.id} className={s.tr}>
                <td className={`${s.td} ${s["td--date"]}`}>{tx.date}</td>
                <td className={`${s.td} ${s["td--desc"]}`}>{tx.description}</td>
                <td className={s.td}><Badge variant={tx.type === "income" ? "teal" : "default"}>{tx.category}</Badge></td>
                <td className={s.td}><Badge variant={tx.type === "income" ? "teal" : "coral"}>{tx.type}</Badge></td>
                <td className={`${s.td} ${s["td--amount"]} ${tx.type === "income" ? s["td--income"] : s["td--expense"]}`}>
                  {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
                </td>
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
            <Select label="Type" options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "income" | "expense" })} />
          </div>
          <div className={s.formRow}>
            <Select label="Category" options={formCategoryOptions} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editTx ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCatManager} onClose={() => setShowCatManager(false)} title="Manage Categories" maxWidth={440}>
        <CategoryManager onClose={() => setShowCatManager(false)} />
      </Modal>
    </div>
  );
}

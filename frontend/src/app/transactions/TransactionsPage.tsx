"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit3, Trash2, ChevronDown, ChevronRight,
  ArrowUp, ArrowDown, ChevronsUpDown, Settings2,
} from "lucide-react";
import {
  Card, Button, Input, Select, Modal, Badge,
  MonthNavigator, EmptyState, Spinner, CategoryManager,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { useCategories } from "@/hooks/useCategories";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/lib/api";
import { formatCurrency, capitalize, todayISO } from "@/lib/utils";
import { SOURCES } from "@/lib/constants";
import type { Transaction, TransactionCreate } from "@/types";
import s from "./Transactions.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | "none";
type GroupKey = string | null; // null = "No Source"

const EMPTY: TransactionCreate = {
  amount: 0, type: "expense", category: "other",
  description: "", date: todayISO(), source: null,
};

// ─── Pure helpers (no side effects, easy to unit test) ───────────────────────

// Groups transactions into an ordered Map: known sources first, null last.
// Using a Map (not a plain object) preserves insertion order reliably.
function groupBySource(txs: Transaction[]): Map<GroupKey, Transaction[]> {
  const map = new Map<GroupKey, Transaction[]>();
  for (const src of [...SOURCES, null]) map.set(src, []);

  for (const tx of txs) {
    const key: GroupKey = (SOURCES as readonly (string | null)[]).includes(tx.source)
      ? tx.source
      : null;
    map.get(key)!.push(tx);
  }

  // Remove empty groups so we don't render ghost section headers
  for (const [k, v] of map) { if (v.length === 0) map.delete(k); }
  return map;
}

function sortTxs(txs: Transaction[], dir: SortDir): Transaction[] {
  if (dir === "none") return txs;
  return [...txs].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dir === "asc" ? diff : -diff;
  });
}

function groupNet(txs: Transaction[]): number {
  return txs.reduce(
    (sum, tx) => sum + (tx.type === "income" ? 1 : -1) * Number(tx.amount), 0
  );
}

// ─── SourceCluster ───────────────────────────────────────────────────────────
// One collapsible cluster per source. Extracted as a sub-component to keep
// TransactionsPage focused on data fetching, not rendering logic.
// Pattern: Compound Component — the parent manages data, children manage display.

interface ClusterProps {
  label: string;
  txs: Transaction[];
  sortDir: SortDir;
  onCycleSort: () => void;
  SortIcon: React.ElementType;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

function SourceCluster({ label, txs, sortDir, onCycleSort, SortIcon, onEdit, onDelete }: ClusterProps) {
  const [open, setOpen] = useState(true);
  const net = groupNet(txs);
  const netPositive = net >= 0;
  const CollapseIcon = open ? ChevronDown : ChevronRight;

  return (
    <div className={s.cluster}>
      {/* Cluster header — click anywhere on it to collapse/expand */}
      <div className={s.clusterHeader} onClick={() => setOpen(o => !o)}>
        <div className={s.clusterLeft}>
          <CollapseIcon size={15} className={s.collapseIcon} />
          <span className={s.clusterLabel}>{label}</span>
          <Badge variant="sky">{txs.length}</Badge>
        </div>
        <span className={`${s.clusterNet} ${netPositive ? s["clusterNet--pos"] : s["clusterNet--neg"]}`}>
          {netPositive ? "+" : "−"}{formatCurrency(Math.abs(net))}
        </span>
      </div>

      {/* Rows — hidden when collapsed, but the sort header stays in the parent table */}
      {open && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={`${s.th} ${s["th--sortable"]}`} onClick={e => { e.stopPropagation(); onCycleSort(); }}>
                  <span className={s.sortHeader}>Date <SortIcon size={12} className={s.sortIcon} /></span>
                </th>
                <th className={s.th}>Description</th>
                <th className={s.th}>Category</th>
                <th className={s.th}>Type</th>
                <th className={`${s.th} ${s["th--right"]}`}>Amount</th>
                <th className={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id} className={s.tr}>
                  <td className={`${s.td} ${s["td--date"]}`}>{tx.date}</td>
                  <td className={`${s.td} ${s["td--desc"]}`}>{tx.description}</td>
                  <td className={s.td}><Badge variant={tx.type === "income" ? "teal" : "default"}>{tx.category}</Badge></td>
                  <td className={s.td}><Badge variant={tx.type === "income" ? "teal" : "coral"}>{tx.type}</Badge></td>
                  <td className={`${s.td} ${s["td--amount"]} ${tx.type === "income" ? s["td--income"] : s["td--expense"]}`}>
                    {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
                  </td>
                  <td className={`${s.td} ${s["td--actions"]}`}>
                    <div className={s.actionsWrap}>
                      <button className={s.actionBtn} onClick={() => onEdit(tx)}><Edit3 size={14} /></button>
                      <button className={`${s.actionBtn} ${s["actionBtn--del"]}`} onClick={() => onDelete(tx.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── TransactionsPage ────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { token } = useAuth();
  const { month, prev, next } = useMonthNav();
  const { categories } = useCategories();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
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
      setTxs(await getTransactions(token, {
        month,
        category: catFilter || undefined,
        type: typeFilter || undefined,
      }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, catFilter, typeFilter, token]);

  useEffect(() => { load(); }, [load]);

  // Source filter is client-side — no need for a backend param for 3 static values
  const filtered = sourceFilter
    ? txs.filter(tx => tx.source === sourceFilter)
    : txs;

  // Group then sort within each group
  const groups = groupBySource(filtered);
  const sortedGroups = new Map(
    [...groups.entries()].map(([key, items]) => [key, sortTxs(items, sortDir)])
  );

  const cycleSortDir = () => setSortDir(d => d === "desc" ? "asc" : d === "asc" ? "none" : "desc");
  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ChevronsUpDown;

  const openAdd = () => { setEditTx(null); setForm({ ...EMPTY, date: todayISO() }); setShowModal(true); };
  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setForm({
      amount: Number(tx.amount), type: tx.type as "income" | "expense",
      category: tx.category, description: tx.description,
      date: tx.date, source: tx.source,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      editTx
        ? await updateTransaction(token, editTx.id, form)
        : await createTransaction(token, form);
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

  const totalNet = filtered.reduce((a, tx) => a + (tx.type === "income" ? 1 : -1) * Number(tx.amount), 0);
  const categoryOptions = [{ value: "", label: "All categories" }, ...categories.map(c => ({ value: c, label: capitalize(c) }))];
  const formCategoryOptions = categories.map(c => ({ value: c, label: capitalize(c) }));
  const sourceOptions = [
    { value: "", label: "All sources" },
    ...SOURCES.map(src => ({ value: src, label: src })),
    { value: "none", label: "No source" },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Transactions</h1>
          <p className={s.subtitle}>{filtered.length} transactions · Net: {formatCurrency(totalNet)}</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" onClick={() => setShowCatManager(true)}>
            <Settings2 size={14} /> Categories
          </Button>
          <Button onClick={openAdd}><Plus size={15} /> Add Transaction</Button>
        </div>
      </div>

      <Card className={s.filters}>
        <div className={s.filtersInner}>
          <MonthNavigator month={month} onPrev={prev} onNext={next} />
          <Select options={categoryOptions} value={catFilter} onChange={e => setCatFilter(e.target.value)} />
          <Select
            options={[{ value: "", label: "All types" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          />
          <Select options={sourceOptions} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} />
        </div>
      </Card>

      {loading ? (
        <Card><div className={s.loading}><Spinner /></div></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ChevronsUpDown}
            title="No transactions found"
            description="Add your first transaction or adjust filters"
            action={<Button onClick={openAdd}><Plus size={15} /> Add Transaction</Button>}
          />
        </Card>
      ) : (
        <div className={s.clusters}>
          {[...sortedGroups.entries()].map(([key, items]) => (
            <SourceCluster
              key={key ?? "__none__"}
              label={key ?? "No Source"}
              txs={items}
              sortDir={sortDir}
              onCycleSort={cycleSortDir}
              SortIcon={SortIcon}
              onEdit={openEdit}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTx ? "Edit Transaction" : "Add Transaction"}>
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
          <Select
            label="Source"
            options={[{ value: "", label: "No source" }, ...SOURCES.map(src => ({ value: src, label: src }))]}
            value={form.source ?? ""}
            onChange={e => setForm({ ...form, source: e.target.value || null })}
          />
          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editTx ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      {/* Category Manager modal */}
      <Modal open={showCatManager} onClose={() => setShowCatManager(false)} title="Manage Categories" maxWidth={440}>
        <CategoryManager onClose={() => setShowCatManager(false)} />
      </Modal>
    </div>
  );
}

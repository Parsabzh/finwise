"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Repeat, TrendingUp, TrendingDown } from "lucide-react";
import { Card, Button, Input, Select, Modal, Badge, EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getRecurringTransactions, createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from "@/lib/api";
import { formatCurrency, capitalize, ordinal, todayISO } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { RecurringTransaction, RecurringTransactionCreate } from "@/types";
import s from "./Recurring.module.css";

const EMPTY: RecurringTransactionCreate = { amount: 0, type: "expense", category: "other", description: "", frequency: "monthly", day_of_month: 1, start_date: todayISO(), end_date: null, is_active: true };

export function RecurringPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState<RecurringTransactionCreate>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => { if (!token) return; setLoading(true); try { setRules(await getRecurringTransactions(token)); } catch (e) { console.error(e); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditRule(null); setForm({ ...EMPTY, start_date: todayISO() }); setShowModal(true); };
  const openEdit = (r: RecurringTransaction) => { setEditRule(r); setForm({ amount: Number(r.amount), type: r.type, category: r.category, description: r.description, frequency: r.frequency, day_of_month: r.day_of_month, start_date: r.start_date, end_date: r.end_date, is_active: r.is_active }); setShowModal(true); };
  const save = async () => {
    if (!token) return; setSaving(true);
    try { editRule ? await updateRecurringTransaction(token, editRule.id, form) : await createRecurringTransaction(token, form); setShowModal(false); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!token || !confirm("Delete?")) return; try { await deleteRecurringTransaction(token, id); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } };

  const totalMonthly = rules.filter(r => r.is_active && r.frequency === "monthly").reduce((a, r) => a + (r.type === "income" ? 1 : -1) * Number(r.amount), 0);

  return (
    <div>
      <div className={s.header}>
        <div><h1 className={s.title}>Recurring</h1><p className={s.subtitle}>Monthly net: {formatCurrency(totalMonthly)}</p></div>
        <Button onClick={openAdd}><Plus size={15} /> Add Rule</Button>
      </div>
      {loading ? <div className={s.loading}><Spinner /></div> : rules.length === 0 ? (
        <Card><EmptyState icon={Repeat} title="No recurring transactions" description="Set up rules for regular payments" action={<Button onClick={openAdd}><Plus size={15} /> Add Rule</Button>} /></Card>
      ) : (
        <div className={s.grid}>{rules.map(r => (
          <Card key={r.id} className={`${s.ruleCard} ${!r.is_active ? s["ruleCard--inactive"] : ""}`}>
            <div className={s.ruleTop}>
              <div className={s.ruleInfo}>
                <div className={`${s.ruleIcon} ${r.type === "income" ? s["ruleIcon--income"] : s["ruleIcon--expense"]}`}>
                  {r.type === "income" ? <TrendingUp size={16} color="var(--color-teal)" /> : <TrendingDown size={16} color="var(--color-text-tertiary)" />}
                </div>
                <div><p className={s.ruleDesc}>{r.description}</p><div className={s.ruleBadges}><Badge variant={r.type === "income" ? "teal" : "default"}>{r.type}</Badge><Badge>{r.category}</Badge></div></div>
              </div>
              <div className={s.ruleActions}><button className={s.actionBtn} onClick={() => openEdit(r)}><Edit3 size={14} /></button><button className={`${s.actionBtn} ${s["actionBtn--del"]}`} onClick={() => remove(r.id)}><Trash2 size={14} /></button></div>
            </div>
            <div className={s.details}>
              <div><p className={s.detailLabel}>Amount</p><p className={`${s.detailValue} ${r.type === "income" ? s["detailValue--income"] : ""}`}>{formatCurrency(r.amount)}</p></div>
              <div><p className={s.detailLabel}>Frequency</p><p className={s.detailValueSm}>{r.frequency}</p></div>
              <div><p className={s.detailLabel}>Day</p><p className={s.detailValueSm}>{ordinal(r.day_of_month)}</p></div>
            </div>
            {!r.is_active && <div className={s.pausedBadge}><Badge variant="amber">Paused</Badge></div>}
          </Card>
        ))}</div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRule ? "Edit Rule" : "Add Rule"} maxWidth={520}>
        <div className={s.formGrid}>
          <Input label="Description" placeholder="e.g., Monthly rent" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className={s.formRow2}>
            <Input label="Amount" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount || ""} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            <Select label="Type" options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
          </div>
          <div className={s.formRow2}>
            <Select label="Category" options={CATEGORIES.map(c => ({ value: c, label: capitalize(c) }))} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <Select label="Frequency" options={[{ value: "monthly", label: "Monthly" }, { value: "weekly", label: "Weekly" }, { value: "yearly", label: "Yearly" }]} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} />
          </div>
          <div className={s.formRow3}>
            <Input label="Day of Month" type="number" min={1} max={28} value={form.day_of_month} onChange={e => setForm({ ...form, day_of_month: parseInt(e.target.value) || 1 })} />
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date || ""} onChange={e => setForm({ ...form, end_date: e.target.value || null })} />
          </div>
          <label className={s.checkboxLabel}><input type="checkbox" className={s.checkbox} checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          <div className={s.formActions}><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={save} loading={saving}>{editRule ? "Update" : "Create"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}

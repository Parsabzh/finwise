"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit3, Trash2, Wallet, AlertTriangle } from "lucide-react";
import { Card, Button, Input, Select, Modal, MonthNavigator, ProgressBar, EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonthNav } from "@/hooks/useMonthNav";
import { getBudgets, createBudget, updateBudget, deleteBudget, getSummary } from "@/lib/api";
import { formatCurrency, capitalize } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { Budget, SummaryResponse } from "@/types";
import s from "./Budgets.module.css";

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
    if (!token) return; setLoading(true);
    try { const [b, sm] = await Promise.all([getBudgets(token, month), getSummary(token, month)]); setBudgets(b); setSummary(sm); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [month, token]);
  useEffect(() => { load(); }, [load]);

  const spendMap = useMemo(() => { const m: Record<string, number> = {}; summary?.by_category?.forEach(c => { m[c.category] = Number(c.total); }); return m; }, [summary]);
  const totalBudget = budgets.reduce((a, b) => a + Number(b.limit_amount), 0);
  const totalSpent = Object.values(spendMap).reduce((a, v) => a + v, 0);

  const openAdd = () => { setEditBudget(null); setForm({ category: "other", limit_amount: "" }); setShowModal(true); };
  const openEdit = (b: Budget) => { setEditBudget(b); setForm({ category: b.category, limit_amount: String(b.limit_amount) }); setShowModal(true); };
  const save = async () => {
    if (!token) return; setSaving(true);
    try { const [y, m] = month.split("-"); const body = { category: form.category, limit_amount: parseFloat(form.limit_amount), month: `${y}-${m}-01` };
      editBudget ? await updateBudget(token, editBudget.id, body) : await createBudget(token, body); setShowModal(false); load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!token || !confirm("Delete this budget?")) return; try { await deleteBudget(token, id); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } };

  return (
    <div>
      <div className={s.header}>
        <div><h1 className={s.title}>Budgets</h1><p className={s.subtitle}>Track spending against limits</p></div>
        <div className={s.headerRight}><MonthNavigator month={month} onPrev={prev} onNext={next} /><Button onClick={openAdd}><Plus size={15} /> Add Budget</Button></div>
      </div>
      <Card className={s.overview} style={{ borderLeft: "4px solid var(--color-teal)" }}>
        <div className={s.overviewTop}>
          <div><p className={s.overviewLabel}>Total Budget</p><p className={s.overviewValue}>{formatCurrency(totalBudget)}</p></div>
          <div style={{ textAlign: "right" }}><p className={s.overviewLabel}>Spent</p><p className={s.overviewValue} style={{ color: "var(--color-teal)" }}>{formatCurrency(totalSpent)}</p></div>
        </div>
        <ProgressBar value={totalSpent} max={totalBudget} height={10} color="var(--color-teal)" />
        <p className={s.overviewMeta}>{formatCurrency(Math.max(0, totalBudget - totalSpent))} remaining · {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% used</p>
      </Card>
      {loading ? <div className={s.loading}><Spinner /></div> : budgets.length === 0 ? (
        <Card><EmptyState icon={Wallet} title="No budgets set" description="Set spending limits per category" action={<Button onClick={openAdd}><Plus size={15} /> Add Budget</Button>} /></Card>
      ) : (
        <div className={s.grid}>{budgets.map(b => {
          const spent = spendMap[b.category] || 0; const limit = Number(b.limit_amount); const pct = Math.round((spent / limit) * 100);
          const isOver = spent > limit; const color = isOver ? "var(--color-coral)" : pct > 80 ? "var(--color-amber)" : "var(--color-teal)";
          return (<Card key={b.id} className={s.budgetCard}><div className={s.budgetTop}><div><p className={s.budgetCat}>{b.category}</p><p className={s.budgetAmt}>{formatCurrency(spent)} / {formatCurrency(limit)}</p></div>
            <div className={s.budgetActions}>{isOver && <AlertTriangle size={14} color="var(--color-coral)" style={{ marginRight: 4, marginTop: 2 }} />}
              <button className={s.actionBtn} onClick={() => openEdit(b)}><Edit3 size={14} /></button><button className={`${s.actionBtn} ${s["actionBtn--del"]}`} onClick={() => remove(b.id)}><Trash2 size={14} /></button>
            </div></div><ProgressBar value={spent} max={limit} color={color} height={7} />
            <div className={s.budgetBottom}><span className={s.budgetPct} style={{ color }}>{pct}%</span><span className={s.budgetLeft}>{isOver ? `${formatCurrency(spent - limit)} over` : `${formatCurrency(limit - spent)} left`}</span></div>
          </Card>);
        })}</div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editBudget ? "Edit Budget" : "Add Budget"}>
        <div className={s.formGrid}>
          <Select label="Category" options={CATEGORIES.map(c => ({ value: c, label: capitalize(c) }))} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <Input label="Budget Limit (€)" type="number" step="0.01" min="0" placeholder="0.00" value={form.limit_amount} onChange={e => setForm({ ...form, limit_amount: e.target.value })} />
          <div className={s.formActions}><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={save} loading={saving}>{editBudget ? "Update" : "Create"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Target } from "lucide-react";
import { Card, Button, Input, Modal, ProgressBar, EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getSavingGoals, createSavingGoal, updateSavingGoal, deleteSavingGoal } from "@/lib/api";
import { formatCurrency, daysUntil } from "@/lib/utils";
import type { SavingGoal } from "@/types";
import s from "./Goals.module.css";

export function GoalsPage() {
  const { token } = useAuth();
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingGoal | null>(null);
  const [form, setForm] = useState({ name: "", target_amount: "", deadline: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => { if (!token) return; setLoading(true); try { setGoals(await getSavingGoals(token)); } catch (e) { console.error(e); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditGoal(null); setForm({ name: "", target_amount: "", deadline: "" }); setShowModal(true); };
  const openEdit = (g: SavingGoal) => { setEditGoal(g); setForm({ name: g.name, target_amount: String(g.target_amount), deadline: g.deadline || "" }); setShowModal(true); };
  const save = async () => {
    if (!token) return; setSaving(true);
    try { const body = { name: form.name, target_amount: parseFloat(form.target_amount), deadline: form.deadline || null };
      editGoal ? await updateSavingGoal(token, editGoal.id, body) : await createSavingGoal(token, body); setShowModal(false); load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!token || !confirm("Delete?")) return; try { await deleteSavingGoal(token, id); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); } };

  const totalTarget = goals.reduce((a, g) => a + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((a, g) => a + Number(g.current_amount), 0);

  return (
    <div>
      <div className={s.header}>
        <div><h1 className={s.title}>Savings Goals</h1><p className={s.subtitle}>{formatCurrency(totalSaved)} of {formatCurrency(totalTarget)}</p></div>
        <Button variant="indigo" onClick={openAdd}><Plus size={15} /> New Goal</Button>
      </div>
      {loading ? <div className={s.loading}><Spinner /></div> : goals.length === 0 ? (
        <Card><EmptyState icon={Target} title="No savings goals" description="Create your first goal" action={<Button variant="indigo" onClick={openAdd}><Plus size={15} /> New Goal</Button>} /></Card>
      ) : (
        <div className={s.grid}>{goals.map(g => {
          const target = Number(g.target_amount); const current = Number(g.current_amount);
          const pct = target > 0 ? Math.round((current / target) * 100) : 0;
          const isComplete = current >= target; const days = g.deadline ? daysUntil(g.deadline) : null;
          return (<Card key={g.id} className={s.goalCard}>
            {isComplete && <div className={s.doneBanner}>DONE</div>}
            <div className={s.goalTop}>
              <div className={s.goalInfo}>
                <div className={s.goalIcon}><Target size={19} color="var(--color-indigo)" /></div>
                <div>
                  <h3 className={s.goalName}>{g.name}</h3>
                  {days !== null && <p className={`${s.goalDeadline} ${days < 0 ? s["goalDeadline--over"] : days < 30 ? s["goalDeadline--soon"] : s["goalDeadline--ok"]}`}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}</p>}
                </div>
              </div>
              <div className={s.goalActions}><button className={s.actionBtn} onClick={() => openEdit(g)}><Edit3 size={14} /></button><button className={`${s.actionBtn} ${s["actionBtn--del"]}`} onClick={() => remove(g.id)}><Trash2 size={14} /></button></div>
            </div>
            <div className={s.progressTop}><span className={s.currentAmt}>{formatCurrency(current)}</span><span className={s.targetAmt}>{formatCurrency(target)}</span></div>
            <ProgressBar value={current} max={target} height={8} color="var(--color-indigo)" />
            <p className={s.progressMeta}>{pct}% · {formatCurrency(Math.max(0, target - current))} to go</p>
          </Card>);
        })}</div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editGoal ? "Edit Goal" : "New Savings Goal"}>
        <div className={s.formGrid}>
          <Input label="Goal Name" placeholder="e.g., Emergency fund" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Target Amount (€)" type="number" step="0.01" min="0" placeholder="0.00" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
          <Input label="Deadline (optional)" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <div className={s.formActions}><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button variant="indigo" onClick={save} loading={saving}>{editGoal ? "Update" : "Create"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}

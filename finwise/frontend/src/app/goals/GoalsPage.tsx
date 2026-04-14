"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Target } from "lucide-react";
import {
  Card, Button, Input, Modal, ProgressBar, EmptyState, Spinner,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getSavingGoals, createSavingGoal, updateSavingGoal, deleteSavingGoal } from "@/lib/api";
import { formatCurrency, daysUntil } from "@/lib/utils";
import type { SavingGoal } from "@/types";
import styles from "./Goals.module.css";

export function GoalsPage() {
  const { token } = useAuth();
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingGoal | null>(null);
  const [form, setForm] = useState({ name: "", target_amount: "", deadline: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getSavingGoals(token);
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditGoal(null);
    setForm({ name: "", target_amount: "", deadline: "" });
    setShowModal(true);
  };

  const openEdit = (g: SavingGoal) => {
    setEditGoal(g);
    setForm({ name: g.name, target_amount: String(g.target_amount), deadline: g.deadline || "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        deadline: form.deadline || null,
      };
      if (editGoal) {
        await updateSavingGoal(token, editGoal.id, body);
      } else {
        await createSavingGoal(token, body);
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
    if (!token || !confirm("Delete this goal?")) return;
    try {
      await deleteSavingGoal(token, id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Savings Goals</h1>
          <p className={styles.subtitle}>
            {formatCurrency(totalSaved)} saved of {formatCurrency(totalTarget)} total
          </p>
        </div>
        <Button onClick={openAdd}><Plus size={16} /> New Goal</Button>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className={styles.loading}><Spinner /></div>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No savings goals"
            description="Create your first savings goal to start tracking your progress"
            action={<Button onClick={openAdd}><Plus size={16} /> New Goal</Button>}
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {goals.map((g) => {
            const target = Number(g.target_amount);
            const current = Number(g.current_amount);
            const pct = target > 0 ? Math.round((current / target) * 100) : 0;
            const isComplete = current >= target;
            const days = g.deadline ? daysUntil(g.deadline) : null;

            return (
              <Card key={g.id} className={styles.goalCard}>
                {isComplete && <div className={styles.doneBanner}>DONE</div>}

                <div className={styles.goalTop}>
                  <div className={styles.goalInfo}>
                    <div className={`${styles.goalIcon} ${isComplete ? styles["goalIcon--done"] : styles["goalIcon--active"]}`}>
                      <Target size={20} color={isComplete ? "var(--color-accent)" : "var(--color-text-secondary)"} />
                    </div>
                    <div>
                      <h3 className={styles.goalName}>{g.name}</h3>
                      {days !== null && (
                        <p className={`${styles.goalDeadline} ${
                          days < 0 ? styles["goalDeadline--overdue"]
                          : days < 30 ? styles["goalDeadline--soon"]
                          : styles["goalDeadline--ok"]
                        }`}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={styles.goalActions}>
                    <button className={styles.actionBtn} onClick={() => openEdit(g)}>
                      <Edit3 size={14} />
                    </button>
                    <button className={`${styles.actionBtn} ${styles["actionBtn--delete"]}`} onClick={() => remove(g.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressTop}>
                    <span className={styles.currentAmount}>{formatCurrency(current)}</span>
                    <span className={styles.targetAmount}>{formatCurrency(target)}</span>
                  </div>
                  <ProgressBar value={current} max={target} color={isComplete ? "var(--color-accent)" : "var(--color-blue)"} height={10} />
                  <p className={styles.progressMeta}>
                    {pct}% complete · {formatCurrency(Math.max(0, target - current))} to go
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editGoal ? "Edit Goal" : "New Savings Goal"}>
        <div className={styles.formGrid}>
          <Input label="Goal Name" placeholder="e.g., Emergency fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Target Amount (€)" type="number" step="0.01" min="0" placeholder="0.00" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          <Input label="Deadline (optional)" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editGoal ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

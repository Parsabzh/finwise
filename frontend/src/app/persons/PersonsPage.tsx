"use client";
import { useState } from "react";
import { Plus, Edit3, Trash2, Users } from "lucide-react";
import { Card, Button, Input, Modal, EmptyState, Spinner } from "@/components/ui";
import { usePersons } from "@/hooks/usePersons";
import s from "./Persons.module.css";

export function PersonsPage() {
  const { persons, loading, create, update, remove } = usePersons();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditId(null); setName(""); setNameError(""); setShowModal(true); };
  const openEdit = (id: string, currentName: string) => { setEditId(id); setName(currentName); setNameError(""); setShowModal(true); };

  const handleSave = async () => {
    if (!name.trim()) { setNameError("Name cannot be empty"); return; }
    setSaving(true);
    try {
      if (editId) { await update(editId, name.trim()); }
      else { await create(name.trim()); }
      setShowModal(false);
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string, personName: string) => {
    if (!confirm(`Delete "${personName}"?`)) return;
    try { await remove(id); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed to delete"); }
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>People</h1>
          <p className={s.subtitle}>{persons.length} {persons.length === 1 ? "person" : "people"}</p>
        </div>
        <Button variant="indigo" onClick={openAdd}><Plus size={15} /> Add Person</Button>
      </div>

      {loading ? (
        <div className={s.loading}><Spinner /></div>
      ) : persons.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No people yet"
            description="Add people to tag them on transactions"
            action={<Button variant="indigo" onClick={openAdd}><Plus size={15} /> Add Person</Button>}
          />
        </Card>
      ) : (
        <Card className={s.listCard}>
          <ul className={s.list}>
            {persons.map(p => (
              <li key={p.id} className={s.row}>
                <div className={s.rowLeft}>
                  <div className={s.avatar}>{p.name.charAt(0).toUpperCase()}</div>
                  <span className={s.name}>{p.name}</span>
                </div>
                <div className={s.actions}>
                  <button className={s.actionBtn} onClick={() => openEdit(p.id, p.name)} title="Edit">
                    <Edit3 size={14} />
                  </button>
                  <button className={`${s.actionBtn} ${s["actionBtn--del"]}`} onClick={() => handleRemove(p.id, p.name)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Person" : "Add Person"}>
        <div className={s.formGrid}>
          <Input
            label="Name"
            placeholder="e.g., Alice"
            value={name}
            onChange={e => { setName(e.target.value); setNameError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            autoFocus
          />
          {nameError && <p className={s.error}>{nameError}</p>}
          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="indigo" onClick={handleSave} loading={saving}>{editId ? "Update" : "Add"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

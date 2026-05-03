"use client";
import { useState } from "react";
import { Person } from "@/lib/api";
import styles from "./PersonSelect.module.css";

interface Props {
  persons:  Person[];
  value:    string | null;
  onChange: (id: string | null) => void;
  onCreate: (name: string) => Promise<void>;
}

export function PersonSelect({ persons, value, onChange, onCreate }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(newName.trim());
      setNewName("");
      setCreating(false);
    } catch {
      setError("Failed to add person. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent form submit
      handleCreate();
    }
    if (e.key === "Escape") {
      setCreating(false);
      setNewName("");
    }
  };

  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={value ?? ""}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">— No person —</option>
        {persons.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {!creating ? (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setCreating(true)}
        >
          + Add new person
        </button>
      ) : (
        <div className={styles.inlineCreate}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Alice, John..."
            className={styles.input}
            disabled={busy}
          />
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
          >
            {busy ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => { setCreating(false); setNewName(""); setError(""); }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

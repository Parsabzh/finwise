"use client";
import { useState } from "react";
import { Plus, Trash2, Lock, Tag } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { Button, Input } from "@/components/ui";
import { useCategories } from "@/hooks/useCategories";
import s from "./CategoryManager.module.css";

interface CategoryManagerProps {
  // Called whenever the category list changes so the parent page
  // can refresh its dropdowns without a full reload.
  onClose: () => void;
}

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const { categories, addCategory, deleteCategory } = useCategories();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    setError("");
    if (!newName.trim()) { setError("Name cannot be empty"); return; }
    const ok = addCategory(newName);
    if (!ok) { setError("Category already exists"); return; }
    setNewName("");
  };

  const handleDelete = (cat: string) => {
    const ok = deleteCategory(cat);
    if (!ok) setError(`"${cat}" is a built-in category and cannot be deleted`);
  };

  const isBuiltIn = (cat: string) => (CATEGORIES as readonly string[]).includes(cat);

  return (
    <div className={s.root}>
      {/* Add new category */}
      <div className={s.addRow}>
        <Input
          placeholder="e.g., pet_care"
          value={newName}
          onChange={e => { setNewName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd}><Plus size={14} /> Add</Button>
      </div>
      {error && <p className={s.error}>{error}</p>}

      {/* Category list */}
      <div className={s.list}>
        {categories.map(cat => (
          <div key={cat} className={s.row}>
            <div className={s.rowLeft}>
              <Tag size={13} className={s.tagIcon} />
              <span className={s.name}>{capitalize(cat)}</span>
              {isBuiltIn(cat) && (
                <span className={s.builtInBadge}><Lock size={10} /> built-in</span>
              )}
            </div>
            <button
              className={`${s.deleteBtn} ${isBuiltIn(cat) ? s["deleteBtn--disabled"] : ""}`}
              onClick={() => handleDelete(cat)}
              disabled={isBuiltIn(cat)}
              title={isBuiltIn(cat) ? "Built-in categories cannot be deleted" : `Delete ${cat}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className={s.footer}>
        <span className={s.footerNote}>{categories.length} total · {categories.length - CATEGORIES.length} custom</span>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

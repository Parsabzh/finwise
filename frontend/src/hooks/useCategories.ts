"use client";
import { useState, useCallback } from "react";
import { CATEGORIES } from "@/lib/constants";

// The built-in categories live in constants.ts and are always present.
// User-defined categories are stored in localStorage so they survive
// page refreshes but don't need a backend endpoint (they're pure UI state).
// This is a deliberate tradeoff: simplicity now, we can move to a DB
// column later when AI categorization (Phase 3) needs to know about them.

const STORAGE_KEY = "finwise:custom_categories";

function loadCustom(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveCustom(cats: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

export function useCategories() {
  const [custom, setCustom] = useState<string[]>(loadCustom);

  // All categories = built-ins first, then user-added ones.
  const all = [...CATEGORIES, ...custom];

  const addCategory = useCallback((name: string) => {
    const slug = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!slug || (CATEGORIES as readonly string[]).includes(slug) || custom.includes(slug)) return false;
    const next = [...custom, slug];
    setCustom(next);
    saveCustom(next);
    return true;
  }, [custom]);

  const deleteCategory = useCallback((name: string) => {
    // Built-in categories cannot be deleted — they're part of the app's
    // taxonomy and may already have transactions attached to them.
    if ((CATEGORIES as readonly string[]).includes(name)) return false;
    const next = custom.filter(c => c !== name);
    setCustom(next);
    saveCustom(next);
    return true;
  }, [custom]);

  return { categories: all, custom, addCategory, deleteCategory };
}

/* ═══════════════════════════════════════════════════════════════════
   useMonthNav — Reusable hook for month-based navigation.

   Multiple pages (dashboard, transactions, budgets) need to navigate
   between months. This hook encapsulates the state and navigation
   logic so each page doesn't reinvent it.
   ═══════════════════════════════════════════════════════════════════ */

"use client";

import { useState, useCallback } from "react";
import { getCurrentMonth, shiftMonth } from "@/lib/utils";

export function useMonthNav(initial?: string) {
  const [month, setMonth] = useState(initial || getCurrentMonth());

  const prev = useCallback(() => {
    setMonth((m) => shiftMonth(m, -1));
  }, []);

  const next = useCallback(() => {
    setMonth((m) => shiftMonth(m, 1));
  }, []);

  return { month, setMonth, prev, next };
}

"use client";
import { useState, useCallback } from "react";
import { getCurrentMonth, shiftMonth } from "@/lib/utils";

export function useMonthNav(initial?: string) {
  const [month, setMonth] = useState(initial || getCurrentMonth());
  const prev = useCallback(() => setMonth((m) => shiftMonth(m, -1)), []);
  const next = useCallback(() => setMonth((m) => shiftMonth(m, 1)), []);
  return { month, setMonth, prev, next };
}

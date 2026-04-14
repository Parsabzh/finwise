/* ═══════════════════════════════════════════════════════════════════
   Pure utility functions — no side effects, no dependencies.
   ═══════════════════════════════════════════════════════════════════ */

import { clsx, type ClassValue } from "clsx";

/** Merge CSS class names — combines clsx for conditional classes */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format a number as EUR currency */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(num || 0);
}

/** Get current month as YYYY-MM */
export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format YYYY-MM to "April 2025" */
export function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Shift a YYYY-MM string by n months (positive = forward, negative = back) */
export function shiftMonth(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Today as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** Days between today and a date string. Negative = overdue */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Ordinal suffix: 1st, 2nd, 3rd, 4th... */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

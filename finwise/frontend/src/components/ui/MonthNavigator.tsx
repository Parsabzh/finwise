"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "@/lib/utils";
import s from "./MonthNavigator.module.css";

export function MonthNavigator({ month, onPrev, onNext }: { month: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className={s.nav}>
      <button className={s.btn} onClick={onPrev}><ChevronLeft size={16} /></button>
      <span className={s.label}>{formatMonth(month)}</span>
      <button className={s.btn} onClick={onNext}><ChevronRight size={16} /></button>
    </div>
  );
}

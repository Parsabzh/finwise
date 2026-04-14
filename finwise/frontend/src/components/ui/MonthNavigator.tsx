"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "@/lib/utils";
import styles from "./MonthNavigator.module.css";

interface MonthNavigatorProps {
  month: string;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({ month, onPrev, onNext }: MonthNavigatorProps) {
  return (
    <div className={styles.nav}>
      <button className={styles.navBtn} onClick={onPrev}>
        <ChevronLeft size={18} />
      </button>
      <span className={styles.navLabel}>{formatMonth(month)}</span>
      <button className={styles.navBtn} onClick={onNext}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

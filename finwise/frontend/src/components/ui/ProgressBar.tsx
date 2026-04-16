"use client";
import s from "./ProgressBar.module.css";

export function ProgressBar({ value, max, color = "var(--color-teal)", height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div className={s.track} style={{ height }}><div className={s.fill} style={{ width: `${pct}%`, background: color }} /></div>;
}

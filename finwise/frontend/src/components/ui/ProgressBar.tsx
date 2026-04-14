"use client";

import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: number;
}

export function ProgressBar({
  value,
  max,
  color = "var(--color-accent)",
  height = 8,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={styles.track} style={{ height }}>
      <div
        className={styles.fill}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

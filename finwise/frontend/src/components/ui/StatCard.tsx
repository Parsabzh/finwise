"use client";

import { type ElementType } from "react";
import { Card } from "./Card";
import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: string;
  icon: ElementType;
  color?: "accent" | "red" | "blue" | "amber";
}

const COLOR_MAP = {
  accent: { bg: "var(--color-accent-light)", fg: "var(--color-accent)" },
  red: { bg: "var(--color-red-light)", fg: "var(--color-red)" },
  blue: { bg: "var(--color-blue-light)", fg: "var(--color-blue)" },
  amber: { bg: "var(--color-amber-light)", fg: "var(--color-amber)" },
};

export function StatCard({ label, value, icon: Icon, color = "accent" }: StatCardProps) {
  const c = COLOR_MAP[color];

  return (
    <Card className={styles.statCard}>
      <div className={styles.statCard__inner}>
        <div>
          <p className={styles.statCard__label}>{label}</p>
          <p className={styles.statCard__value}>{value}</p>
        </div>
        <div className={styles.statCard__icon} style={{ background: c.bg }}>
          <Icon size={20} color={c.fg} />
        </div>
      </div>
    </Card>
  );
}

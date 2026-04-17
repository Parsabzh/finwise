"use client";
import { type ElementType } from "react";
import { Card } from "./Card";
import s from "./StatCard.module.css";

interface StatCardProps { label: string; value: string; icon: ElementType; iconBg?: string; iconColor?: string; accent?: string; }

export function StatCard({ label, value, icon: Icon, iconBg = "var(--color-surface-alt)", iconColor = "var(--color-text-secondary)", accent }: StatCardProps) {
  return (
    <Card className={s.card} style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <div className={s.inner}>
        <div>
          <p className={s.label}>{label}</p>
          <p className={s.value}>{value}</p>
        </div>
        <div className={s.icon} style={{ background: iconBg }}>
          <Icon size={19} color={iconColor} />
        </div>
      </div>
    </Card>
  );
}

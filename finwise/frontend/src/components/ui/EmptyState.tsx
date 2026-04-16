"use client";
import { type ElementType, type ReactNode } from "react";
import s from "./EmptyState.module.css";

export function EmptyState({ icon: Icon, title, description, action }: { icon: ElementType; title: string; description: string; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <div className={s.icon}><Icon size={24} color="var(--color-teal)" /></div>
      <h3 className={s.title}>{title}</h3>
      <p className={s.desc}>{description}</p>
      {action}
    </div>
  );
}

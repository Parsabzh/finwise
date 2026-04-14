"use client";

import { type ElementType, type ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.empty__icon}>
        <Icon size={24} color="var(--color-accent)" />
      </div>
      <h3 className={styles.empty__title}>{title}</h3>
      <p className={styles.empty__desc}>{description}</p>
      {action}
    </div>
  );
}

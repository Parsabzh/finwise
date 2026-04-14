"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./Badge.module.css";

type BadgeColor = "green" | "red" | "amber" | "blue" | "purple" | "gray";

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[`badge--${color}`], className)}>
      {children}
    </span>
  );
}

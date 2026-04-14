"use client";

import { type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className, style, onClick }: CardProps) {
  return (
    <div className={cn(styles.card, className)} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

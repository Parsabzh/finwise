"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        className={cn(styles.input, error && styles["input--error"], className)}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

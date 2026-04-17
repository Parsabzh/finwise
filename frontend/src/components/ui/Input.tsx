"use client";
import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import s from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className={s.field}>
      {label && <label className={s.label}>{label}</label>}
      <input className={cn(s.input, error && s["input--error"], className)} {...props} />
      {error && <span className={s.error}>{error}</span>}
    </div>
  );
}

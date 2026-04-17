"use client";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "teal" | "indigo" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "teal", loading = false, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button className={cn(s.btn, s[`btn--${variant}`], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
      {children}
    </button>
  );
}

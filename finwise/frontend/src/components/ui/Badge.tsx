"use client";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import s from "./Badge.module.css";

export type BadgeVariant = "default" | "teal" | "indigo" | "coral" | "amber" | "violet" | "sky";

export function Badge({ children, variant = "default", className }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  return <span className={cn(s.badge, s[`badge--${variant}`], className)}>{children}</span>;
}

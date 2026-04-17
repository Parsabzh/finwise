"use client";
import { type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import s from "./Card.module.css";

export function Card({ children, className, style, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void }) {
  return <div className={cn(s.card, className)} style={style} onClick={onClick}>{children}</div>;
}

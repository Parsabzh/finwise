"use client";
import { type SelectHTMLAttributes } from "react";
import s from "./Select.module.css";

interface Option { value: string; label: string; }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: Option[]; }

export function Select({ label, options, ...props }: SelectProps) {
  return (
    <div className={s.field}>
      {label && <label className={s.label}>{label}</label>}
      <select className={s.select} {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

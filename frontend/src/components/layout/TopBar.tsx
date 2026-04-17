"use client";
import { Menu, User } from "lucide-react";
import s from "./TopBar.module.css";

export function TopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className={s.topbar}>
      <button className={s.menuBtn} onClick={onMenuToggle}><Menu size={22} /></button>
      <div />
      <div className={s.avatar}><User size={15} color="var(--color-teal)" /></div>
    </header>
  );
}

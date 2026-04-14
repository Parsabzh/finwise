"use client";

import { Menu, User } from "lucide-react";
import styles from "./TopBar.module.css";

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} onClick={onMenuToggle}>
        <Menu size={22} />
      </button>
      <div />
      <div className={styles.avatar}>
        <User size={16} color="var(--color-accent)" />
      </div>
    </header>
  );
}

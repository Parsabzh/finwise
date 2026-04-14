"use client";

import {
  LayoutDashboard, ArrowUpDown, Wallet, Target, Repeat, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Sidebar.module.css";

export type PageId = "dashboard" | "transactions" | "budgets" | "goals" | "recurring";

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowUpDown },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "goals", label: "Savings Goals", icon: Target },
  { id: "recurring", label: "Recurring", icon: Repeat },
];

interface SidebarProps {
  active: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ active, onNavigate, onLogout, open, onToggle }: SidebarProps) {
  const handleNav = (id: PageId) => {
    onNavigate(id);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) onToggle();
  };

  return (
    <>
      {/* Mobile overlay — only visible when sidebar is open on small screens */}
      {open && <div className={styles.overlay} onClick={onToggle} />}

      <aside className={cn(styles.sidebar, open && styles["sidebar--open"])}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Wallet size={18} color="#fff" />
          </div>
          <span className={styles.logoText}>FinWise</span>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={cn(
                styles.navItem,
                active === item.id && styles["navItem--active"]
              )}
              onClick={() => handleNav(item.id)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={onLogout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

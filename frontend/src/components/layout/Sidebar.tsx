"use client";
import { LayoutDashboard, ArrowUpDown, Wallet, Target, Repeat, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./Sidebar.module.css";

export type PageId = "dashboard" | "transactions" | "budgets" | "goals" | "recurring";

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowUpDown },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "goals", label: "Savings Goals", icon: Target },
  { id: "recurring", label: "Recurring", icon: Repeat },
];

interface SidebarProps { active: PageId; onNavigate: (p: PageId) => void; onLogout: () => void; open: boolean; onToggle: () => void; }

export function Sidebar({ active, onNavigate, onLogout, open, onToggle }: SidebarProps) {
  return (
    <>
      {open && <div className={s.overlay} onClick={onToggle} />}
      <aside className={cn(s.sidebar, open && s["sidebar--open"])}>
        <div className={s.logo}>
          <div className={s.logoIcon}><Wallet size={17} color="#fff" /></div>
          <span className={s.logoText}>FinWise</span>
        </div>
        <nav className={s.nav}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={cn(s.navItem, active === item.id && s["navItem--active"])}
              onClick={() => { onNavigate(item.id); if (window.innerWidth < 768) onToggle(); }}>
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>
        <div className={s.footer}>
          <button className={s.logoutBtn} onClick={onLogout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
    </>
  );
}

"use client";
import { useState } from "react";
import { Sidebar, TopBar, type PageId } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "./auth/AuthPage";
import { DashboardPage } from "./dashboard/DashboardPage";
import { TransactionsPage } from "./transactions/TransactionsPage";
import { BudgetsPage } from "./budgets/BudgetsPage";
import { GoalsPage } from "./goals/GoalsPage";
import { RecurringPage } from "./recurring/RecurringPage";
import s from "./AppShell.module.css";

const PAGES: Record<PageId, React.ReactNode> = {
  dashboard: <DashboardPage />, transactions: <TransactionsPage />,
  budgets: <BudgetsPage />, goals: <GoalsPage />, recurring: <RecurringPage />,
};

export function AppShell() {
  const { isAuthenticated, logout } = useAuth();
  const [page, setPage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) return <AuthPage />;

  return (
    <div className={s.shell}>
      <Sidebar active={page} onNavigate={setPage} onLogout={logout} open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className={s.main}>
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className={s.content}>{PAGES[page]}</div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared TypeScript types — mirrors backend Pydantic schemas exactly.
   Every API response gets deserialized into one of these.
   ═══════════════════════════════════════════════════════════════════ */

// ── Auth ──────────────────────────────────────────────────────────────

export interface UserCreate {
  email: string;
  name: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── Transactions ─────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";

export interface TransactionCreate {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  date: string;
  ai_category: string | null;
  created_at: string;
}

// ── Budgets ──────────────────────────────────────────────────────────

export interface BudgetCreate {
  category: string;
  limit_amount: number;
  month: string; // YYYY-MM-DD (first of month)
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  month: string;
  created_at: string;
}

// ── Savings Goals ────────────────────────────────────────────────────

export interface SavingGoalCreate {
  name: string;
  target_amount: number;
  deadline: string | null;
}

export interface SavingGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

// ── Recurring Transactions ───────────────────────────────────────────

export interface RecurringTransactionCreate {
  amount: number;
  type: string;
  category: string;
  description: string;
  frequency: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  frequency: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Summary ──────────────────────────────────────────────────────────

export interface CategorySummary {
  category: string;
  total: number;
  budget: number | null;
}

export interface SummaryResponse {
  month: string;
  total_income: number;
  total_expenses: number;
  net_savings: number;
  by_category: CategorySummary[];
}

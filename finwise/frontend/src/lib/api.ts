/* ═══════════════════════════════════════════════════════════════════
   API Client — single module for all backend communication.

   Every component imports from here instead of calling fetch directly.
   This gives us one place to handle auth headers, error parsing,
   base URL config, and future concerns like retry logic.
   ═══════════════════════════════════════════════════════════════════ */

import type {
  TokenResponse,
  UserCreate,
  UserResponse,
  Transaction,
  TransactionCreate,
  Budget,
  BudgetCreate,
  SavingGoal,
  SavingGoalCreate,
  RecurringTransaction,
  RecurringTransactionCreate,
  SummaryResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Generic request helper ───────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content (e.g., DELETE responses)
  if (res.status === 204) return null as T;

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────

export async function register(data: UserCreate): Promise<UserResponse> {
  return request<UserResponse>("/api/auth/register", {
    method: "POST",
    body: data,
  });
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  // Login uses form-encoded data (OAuth2 spec), not JSON
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data as TokenResponse;
}

// ── Transactions ─────────────────────────────────────────────────────

interface TransactionFilters {
  month?: string;
  category?: string;
  type?: string;
  skip?: number;
  limit?: number;
}

export async function getTransactions(
  token: string,
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.category) params.set("category", filters.category);
  if (filters.type) params.set("type", filters.type);
  if (filters.skip !== undefined) params.set("skip", String(filters.skip));
  params.set("limit", String(filters.limit || 100));

  const query = params.toString();
  return request<Transaction[]>(`/api/transactions/?${query}`, { token });
}

export async function createTransaction(
  token: string,
  data: TransactionCreate
): Promise<Transaction> {
  return request<Transaction>("/api/transactions/", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updateTransaction(
  token: string,
  id: string,
  data: TransactionCreate
): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${id}`, {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deleteTransaction(token: string, id: string): Promise<void> {
  return request<void>(`/api/transactions/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Budgets ──────────────────────────────────────────────────────────

export async function getBudgets(
  token: string,
  month?: string
): Promise<Budget[]> {
  const params = month ? `?month=${month}` : "";
  return request<Budget[]>(`/api/budgets/${params}`, { token });
}

export async function createBudget(
  token: string,
  data: BudgetCreate
): Promise<Budget> {
  return request<Budget>("/api/budgets/", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updateBudget(
  token: string,
  id: string,
  data: BudgetCreate
): Promise<Budget> {
  return request<Budget>(`/api/budgets/${id}`, {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deleteBudget(token: string, id: string): Promise<void> {
  return request<void>(`/api/budgets/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Savings Goals ────────────────────────────────────────────────────

export async function getSavingGoals(token: string): Promise<SavingGoal[]> {
  return request<SavingGoal[]>("/api/saving-goals/", { token });
}

export async function createSavingGoal(
  token: string,
  data: SavingGoalCreate
): Promise<SavingGoal> {
  return request<SavingGoal>("/api/saving-goals/", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updateSavingGoal(
  token: string,
  id: string,
  data: SavingGoalCreate
): Promise<SavingGoal> {
  return request<SavingGoal>(`/api/saving-goals/${id}`, {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deleteSavingGoal(token: string, id: string): Promise<void> {
  return request<void>(`/api/saving-goals/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Recurring Transactions ───────────────────────────────────────────

export async function getRecurringTransactions(
  token: string
): Promise<RecurringTransaction[]> {
  return request<RecurringTransaction[]>("/api/recurring/", { token });
}

export async function createRecurringTransaction(
  token: string,
  data: RecurringTransactionCreate
): Promise<RecurringTransaction> {
  return request<RecurringTransaction>("/api/recurring/", {
    method: "POST",
    body: data,
    token,
  });
}

export async function updateRecurringTransaction(
  token: string,
  id: string,
  data: RecurringTransactionCreate
): Promise<RecurringTransaction> {
  return request<RecurringTransaction>(`/api/recurring/${id}`, {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deleteRecurringTransaction(
  token: string,
  id: string
): Promise<void> {
  return request<void>(`/api/recurring/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Summary ──────────────────────────────────────────────────────────

export async function getSummary(
  token: string,
  month: string
): Promise<SummaryResponse> {
  return request<SummaryResponse>(`/api/summary/?month=${month}`, { token });
}

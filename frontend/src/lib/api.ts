import type { TokenResponse, UserCreate, UserResponse, Transaction, TransactionCreate, Budget, BudgetCreate, SavingGoal, SavingGoalCreate, RecurringTransaction, RecurringTransactionCreate, SummaryResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions { method?: string; body?: unknown; token?: string; }

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data as T;
}

export async function register(data: UserCreate): Promise<UserResponse> { return request("/api/auth/register", { method: "POST", body: data }); }

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}` });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data as TokenResponse;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return await request<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, new_password: string): Promise<void> {
  await request<void>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
}

interface TxFilters { month?: string; category?: string; type?: string; skip?: number; limit?: number; }
export async function getTransactions(token: string, filters: TxFilters = {}): Promise<Transaction[]> {
  const p = new URLSearchParams();
  if (filters.month) p.set("month", filters.month);
  if (filters.category) p.set("category", filters.category);
  if (filters.type) p.set("type", filters.type);
  p.set("limit", String(filters.limit || 100));
  return request(`/api/transactions/?${p}`, { token });
}
export async function createTransaction(token: string, data: TransactionCreate): Promise<Transaction> { return request("/api/transactions/", { method: "POST", body: data, token }); }
export async function updateTransaction(token: string, id: string, data: TransactionCreate): Promise<Transaction> { return request(`/api/transactions/${id}`, { method: "PUT", body: data, token }); }
export async function deleteTransaction(token: string, id: string): Promise<void> { return request(`/api/transactions/${id}`, { method: "DELETE", token }); }

export async function getBudgets(token: string, month?: string): Promise<Budget[]> { return request(`/api/budgets/${month ? `?month=${month}` : ""}`, { token }); }
export async function createBudget(token: string, data: BudgetCreate): Promise<Budget> { return request("/api/budgets/", { method: "POST", body: data, token }); }
export async function updateBudget(token: string, id: string, data: BudgetCreate): Promise<Budget> { return request(`/api/budgets/${id}`, { method: "PUT", body: data, token }); }
export async function deleteBudget(token: string, id: string): Promise<void> { return request(`/api/budgets/${id}`, { method: "DELETE", token }); }

export async function getSavingGoals(token: string): Promise<SavingGoal[]> { return request("/api/saving-goals/", { token }); }
export async function createSavingGoal(token: string, data: SavingGoalCreate): Promise<SavingGoal> { return request("/api/saving-goals/", { method: "POST", body: data, token }); }
export async function updateSavingGoal(token: string, id: string, data: SavingGoalCreate): Promise<SavingGoal> { return request(`/api/saving-goals/${id}`, { method: "PUT", body: data, token }); }
export async function deleteSavingGoal(token: string, id: string): Promise<void> { return request(`/api/saving-goals/${id}`, { method: "DELETE", token }); }

export async function getRecurringTransactions(token: string): Promise<RecurringTransaction[]> { return request("/api/recurring/", { token }); }
export async function createRecurringTransaction(token: string, data: RecurringTransactionCreate): Promise<RecurringTransaction> { return request("/api/recurring/", { method: "POST", body: data, token }); }
export async function updateRecurringTransaction(token: string, id: string, data: RecurringTransactionCreate): Promise<RecurringTransaction> { return request(`/api/recurring/${id}`, { method: "PUT", body: data, token }); }
export async function deleteRecurringTransaction(token: string, id: string): Promise<void> { return request(`/api/recurring/${id}`, { method: "DELETE", token }); }

export async function getSummary(token: string, month: string): Promise<SummaryResponse> { return request(`/api/summary/?month=${month}`, { token }); }

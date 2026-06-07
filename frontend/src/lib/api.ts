import type { TokenResponse, UserCreate, UserResponse, Transaction, TransactionCreate, Budget, BudgetCreate, SavingGoal, SavingGoalCreate, RecurringTransaction, RecurringTransactionCreate, SummaryResponse, Person, ParsePreview, ParsedTransaction, ImportResult } from "@/types";
export type { Person };

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

interface RequestOptions { method?: string; body?: unknown; token?: string; }

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null as T;
  let data: any; // intentional: res.json() shape is unknown at compile time
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    const raw = data?.detail;
    const detail: string = Array.isArray(raw)
      ? raw.map((e: { msg: string }) => e.msg).join(", ")
      : typeof raw === "string" ? raw : "";
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function register(data: UserCreate): Promise<UserResponse> { return request("/api/auth/register", { method: "POST", body: data }); }

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}` });
  const data = await res.json();
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((e: { msg: string }) => e.msg).join(", ")
      : data.detail;
    throw new Error(detail || "Login failed");
  }
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

interface TxFilters { month?: string; date_from?: string; date_to?: string; category?: string; type?: string; skip?: number; limit?: number; }
export async function getTransactions(token: string, filters: TxFilters = {}): Promise<Transaction[]> {
  const p = new URLSearchParams();
  if (filters.month) p.set("month", filters.month);
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
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

export async function getSummary(token: string, query: { month?: string; date_from?: string; date_to?: string }): Promise<SummaryResponse> {
  const p = new URLSearchParams();
  if (query.month) p.set("month", query.month);
  if (query.date_from) p.set("date_from", query.date_from);
  if (query.date_to) p.set("date_to", query.date_to);
  return request(`/api/summary/?${p}`, { token });
}

export async function getPersons(token: string): Promise<Person[]> { return request("/api/persons/", { token }); }
export async function createPerson(token: string, name: string): Promise<Person> { return request("/api/persons/", { method: "POST", body: { name }, token }); }
export async function updatePerson(token: string, id: string, name: string): Promise<Person> { return request(`/api/persons/${id}`, { method: "PUT", body: { name }, token }); }
export async function deletePerson(token: string, id: string): Promise<void> { return request(`/api/persons/${id}`, { method: "DELETE", token }); }

// CSV import (Gemini). `parse` is multipart, so it bypasses the JSON `request` helper.
export async function parseCsvImport(token: string, file: File): Promise<ParsePreview> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/api/import/parse`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    const raw = data?.detail;
    const detail: string = Array.isArray(raw) ? raw.map((e: { msg: string }) => e.msg).join(", ") : typeof raw === "string" ? raw : "";
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return data as ParsePreview;
}
export async function commitCsvImport(token: string, payload: { source: string; person_name: string; transactions: ParsedTransaction[] }): Promise<ImportResult> {
  return request("/api/import/commit", { method: "POST", body: payload, token });
}

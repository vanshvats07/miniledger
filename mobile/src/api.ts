import type { Loan, LoanSummary, LoginResponse } from "./types";

// Expo exposes variables prefixed with EXPO_PUBLIC_ to the app.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string;
};

// One helper keeps URL handling, authorization headers and errors consistent.
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  let data: { message?: string } & Record<string, unknown> = {};
  try {
    data = (await response.json()) as { message?: string } & Record<string, unknown>;
  } catch {
    // If the server doesn't send JSON, the status code still tells us it failed.
  }

  if (!response.ok) {
    throw new Error(data.message ?? `Request failed with status ${response.status}.`);
  }
  return data as T;
}

export function sendOtp(phone: string): Promise<{ message: string }> {
  return request("/auth/send-otp", { method: "POST", body: { phone } });
}

export function verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
  return request("/auth/verify-otp", { method: "POST", body: { phone, otp } });
}

export async function getLoans(token: string): Promise<Loan[]> {
  const result = await request<{ loans: Loan[] }>("/loans", { token });
  return result.loans;
}

export async function getSummary(token: string): Promise<LoanSummary> {
  const result = await request<{ summary: LoanSummary }>("/loans/summary", { token });
  return result.summary;
}

export function addLoan(
  token: string,
  loan: { friendName: string; amount: number; dueDate: string },
): Promise<{ loan: Loan }> {
  return request("/loans", { method: "POST", token, body: loan });
}

export function markLoanRepaid(token: string, loanId: number): Promise<{ loan: Loan }> {
  return request(`/loans/${loanId}/repay`, { method: "PATCH", token, body: {} });
}

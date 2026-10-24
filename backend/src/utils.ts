// Small validation helpers are kept together so they are easy to understand and test.
export function isValidPhone(phone: string): boolean {
  // Accept 10 to 15 digits, optionally starting with + (for example +919876543210).
  return /^\+?[1-9]\d{9,14}$/.test(phone);
}

export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000;
}

export function isValidDate(date: string): boolean {
  // The app sends YYYY-MM-DD. The round-trip check rejects dates such as 2026-02-31.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
}

export function isOverdue(dueDate: string, isRepaid: boolean, today = new Date()): boolean {
  if (isRepaid) return false;
  return dueDate < today.toISOString().slice(0, 10);
}

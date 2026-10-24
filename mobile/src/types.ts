export type Loan = {
  id: number;
  friendName: string;
  amount: number;
  dueDate: string;
  isRepaid: boolean;
  createdAt: string;
};

export type LoanSummary = {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
};

export type LoginResponse = {
  token: string;
  user: { id: number; phone: string };
};

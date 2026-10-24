import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { isValidAmount, isValidDate } from "../utils";

export const loansRouter = Router();
loansRouter.use(requireAuth);

const loanFields = `
  id,
  friend_name AS "friendName",
  amount,
  to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
  is_repaid AS "isRepaid",
  created_at AS "createdAt"
`;

// Return only the signed-in user's loans.
loansRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await pool.query(
      `SELECT ${loanFields}
       FROM loans
       WHERE user_id = $1
       ORDER BY is_repaid ASC, due_date ASC, created_at DESC`,
      [userId],
    );

    const loans = result.rows.map((loan) => ({ ...loan, amount: Number(loan.amount) }));
    res.json({ loans });
  } catch (error) {
    next(error);
  }
});

// Calculate the three summary values from the database.
loansRouter.get("/summary", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS "totalLent",
         COALESCE(SUM(CASE WHEN is_repaid = TRUE THEN amount ELSE 0 END), 0) AS "totalRepaid",
         COALESCE(SUM(CASE WHEN is_repaid = FALSE AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) AS "overdueAmount"
       FROM loans
       WHERE user_id = $1`,
      [userId],
    );

    const row = result.rows[0];
    res.json({ summary: {
      totalLent: Number(row.totalLent),
      totalRepaid: Number(row.totalRepaid),
      overdueAmount: Number(row.overdueAmount),
    } });
  } catch (error) {
    next(error);
  }
});

// Validate and save a new loan entry.
loansRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const friendName = typeof req.body?.friendName === "string" ? req.body.friendName.trim() : "";
    const amount = Number(req.body?.amount);
    const dueDate = typeof req.body?.dueDate === "string" ? req.body.dueDate.trim() : "";

    if (friendName.length < 1 || friendName.length > 100) {
      res.status(400).json({ message: "Friend name must be between 1 and 100 characters." });
      return;
    }
    if (!isValidAmount(amount)) {
      res.status(400).json({ message: "Amount must be greater than zero and no more than 1,000,000,000." });
      return;
    }
    if (!isValidDate(dueDate)) {
      res.status(400).json({ message: "Due date must be a real date in YYYY-MM-DD format." });
      return;
    }

    const result = await pool.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${loanFields}`,
      [userId, friendName, amount, dueDate],
    );
    const loan = result.rows[0];
    res.status(201).json({ loan: { ...loan, amount: Number(loan.amount) } });
  } catch (error) {
    next(error);
  }
});

// Only the owner can mark a loan as repaid.
loansRouter.patch("/:id/repay", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const loanId = Number(req.params.id);

    if (!Number.isInteger(loanId) || loanId < 1) {
      res.status(400).json({ message: "Loan ID must be a positive integer." });
      return;
    }

    const result = await pool.query(
      `UPDATE loans
       SET is_repaid = TRUE, repaid_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_repaid = FALSE
       RETURNING ${loanFields}`,
      [loanId, userId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Loan not found or already marked as repaid." });
      return;
    }

    const loan = result.rows[0];
    res.json({ loan: { ...loan, amount: Number(loan.amount) } });
  } catch (error) {
    next(error);
  }
});

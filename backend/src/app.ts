import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { loansRouter } from "./routes/loans.routes";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "MiniLedger API" });
});
app.use("/api/auth", authRouter);
app.use("/api/loans", loansRouter);

// One place for unexpected errors, so route handlers stay easy to read.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API error:", error);
  res.status(500).json({ message: "Something went wrong on the server. Check the backend terminal." });
});

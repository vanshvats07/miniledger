import "dotenv/config";
import { app } from "./app";
import { pool } from "./db";

const port = Number(process.env.PORT) || 4000;

async function startServer(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Copy backend/.env.example to backend/.env.");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing. Add it to backend/.env before starting the server.");
  }

  await pool.query("SELECT 1");
  console.log("Connected to PostgreSQL.");

  app.listen(port, () => {
    console.log(`MiniLedger API is running at http://localhost:${port}`);
    console.log("Mock OTP codes will appear in this terminal when requested.");
  });
}

startServer().catch((error: unknown) => {
  console.error("Could not start MiniLedger:", error);
  process.exit(1);
});

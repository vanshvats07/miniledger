import { randomInt } from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";
import { otpStore } from "../otpStore";
import { isValidPhone } from "../utils";

export const authRouter = Router();
const OTP_LIFETIME_MS = 5 * 60 * 1000;

// Step 1: generate a mock OTP. It is logged in the server terminal, not sent by SMS.
authRouter.post("/send-otp", (req, res) => {
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim().replace(/\s+/g, "") : "";

  if (!isValidPhone(phone)) {
    res.status(400).json({ message: "Enter a valid phone number with 10 to 15 digits." });
    return;
  }

  const code = String(randomInt(100000, 1_000_000));
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_LIFETIME_MS });
  console.log(`[MiniLedger] Mock OTP for ${phone}: ${code}`);
  res.json({ message: "Mock OTP generated. Check the backend terminal." });
});

// Step 2: check the code, create the user if needed, and return a signed login token.
authRouter.post("/verify-otp", async (req, res, next) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim().replace(/\s+/g, "") : "";
    const code = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
      res.status(400).json({ message: "Enter a valid phone number and the 6-digit OTP." });
      return;
    }

    const savedOtp = otpStore.get(phone);
    if (!savedOtp || savedOtp.expiresAt < Date.now()) {
      otpStore.delete(phone);
      res.status(400).json({ message: "OTP is missing or has expired. Request a new one." });
      return;
    }

    if (savedOtp.code !== code) {
      res.status(400).json({ message: "That OTP is not correct. Please try again." });
      return;
    }

    // A successful OTP can only be used once.
    otpStore.delete(phone);

    const userResult = await pool.query(
      `INSERT INTO users (phone)
       VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, phone`,
      [phone],
    );
    const user = userResult.rows[0] as { id: number; phone: string };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: "Server authentication is not configured." });
      return;
    }

    const token = jwt.sign({ userId: user.id, phone: user.phone }, secret, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

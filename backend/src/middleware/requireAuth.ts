import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedRequest } from "../types";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({ message: "Please log in first." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: "Server authentication is not configured." });
    return;
  }

  try {
    const token = authorization.slice("Bearer ".length);
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string" || typeof decoded.userId !== "number" || typeof decoded.phone !== "string") {
      res.status(401).json({ message: "Invalid login token. Please log in again." });
      return;
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    authenticatedRequest.userId = decoded.userId;
    authenticatedRequest.phone = decoded.phone;
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

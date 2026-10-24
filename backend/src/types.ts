import type { Request } from "express";

// requireAuth adds these fields after it verifies the user's JWT.
export type AuthenticatedRequest = Request & { userId: number; phone: string };

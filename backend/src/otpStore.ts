// This in-memory map is enough for a mock-OTP assignment.
// It is cleared when the server restarts and is not suitable for production authentication.
export type OtpRecord = { code: string; expiresAt: number };
export const otpStore = new Map<string, OtpRecord>();

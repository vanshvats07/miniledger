import { describe, expect, it } from "vitest";
import { isOverdue, isValidAmount, isValidDate, isValidPhone } from "../src/utils";

describe("phone validation", () => {
  it("accepts 10-digit numbers and international numbers", () => {
    expect(isValidPhone("9876543210")).toBe(true);
    expect(isValidPhone("+919876543210")).toBe(true);
  });
  it("rejects a too-short number", () => {
    expect(isValidPhone("12345")).toBe(false);
  });
});

describe("amount validation", () => {
  it("accepts a positive amount", () => expect(isValidAmount(250)).toBe(true));
  it("rejects zero, negative and infinite amounts", () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("date validation", () => {
  it("accepts a real YYYY-MM-DD date", () => expect(isValidDate("2026-10-22")).toBe(true));
  it("rejects impossible dates and other formats", () => {
    expect(isValidDate("2026-02-31")).toBe(false);
    expect(isValidDate("22-10-2026")).toBe(false);
  });
});

describe("overdue logic", () => {
  const today = new Date("2026-10-22T12:00:00.000Z");
  it("only flags unpaid loans whose due date is before today", () => {
    expect(isOverdue("2026-10-21", false, today)).toBe(true);
    expect(isOverdue("2026-10-22", false, today)).toBe(false);
    expect(isOverdue("2026-10-21", true, today)).toBe(false);
  });
});

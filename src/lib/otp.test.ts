import { describe, it, expect, beforeEach } from "vitest";
import {
  validateIndianPhone,
  generateNumericOtp,
  isValidUpiId,
  createSignupOtp,
  verifySignupOtp,
  createWithdrawalOtp,
  verifyWithdrawalOtp,
} from "./otp";

describe("OTP and Validation Utilities", () => {
  describe("validateIndianPhone", () => {
    it("validates and formats a normal 10-digit number starting with 6-9", () => {
      const res = validateIndianPhone("9876543210");
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe("+919876543210");
      expect(res.cleanDigits).toBe("9876543210");
    });

    it("handles number with +91 prefix and spaces or hyphens", () => {
      const res = validateIndianPhone("+91 87654-32109");
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe("+918765432109");
      expect(res.cleanDigits).toBe("8765432109");
    });

    it("handles number with 91 prefix without plus", () => {
      const res = validateIndianPhone("917012345678");
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe("+917012345678");
    });

    it("handles number with leading 0", () => {
      const res = validateIndianPhone("06987654321");
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe("+916987654321");
    });

    it("rejects numbers not starting with 6, 7, 8, or 9", () => {
      const res = validateIndianPhone("5123456789");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("must start with 6, 7, 8, or 9");
    });

    it("rejects numbers that don't have 10 digits", () => {
      const res = validateIndianPhone("98765");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("10-digit");
    });
  });

  describe("isValidUpiId", () => {
    it("accepts valid UPI VPAs", () => {
      expect(isValidUpiId("user@oksbi")).toBe(true);
      expect(isValidUpiId("9876543210@paytm")).toBe(true);
      expect(isValidUpiId("rahul.sharma@apl")).toBe(true);
      expect(isValidUpiId("shoppers_hub@icici")).toBe(true);
    });

    it("rejects invalid UPI formats", () => {
      expect(isValidUpiId("invalid_upi")).toBe(false);
      expect(isValidUpiId("@oksbi")).toBe(false);
      expect(isValidUpiId("user@")).toBe(false);
      expect(isValidUpiId("")).toBe(false);
    });
  });

  describe("generateNumericOtp", () => {
    it("generates a 6-digit numeric string", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateNumericOtp();
        expect(code).toMatch(/^\d{6}$/);
      }
    });
  });

  describe("Signup OTP flow", () => {
    const testEmail = "testuser@earnkaro.test";

    it("creates an OTP and enforces resend cooldown", async () => {
      const first = await createSignupOtp({
        name: "Test Partner",
        email: testEmail,
        phone: "+919876543210",
        password: "secretpassword123",
      });

      expect(first.ok).toBe(true);
      expect(first.code).toMatch(/^\d{6}$/);

      // Immediate resend should be blocked by cooldown
      const second = await createSignupOtp({
        name: "Test Partner",
        email: testEmail,
        phone: "+919876543210",
        password: "secretpassword123",
      });

      expect(second.ok).toBe(false);
      expect(second.error).toContain("Please wait");
    });

    it("verifies correctly with matching OTP and fails with wrong OTP", async () => {
      const specificEmail = "verify@earnkaro.test";
      const created = await createSignupOtp({
        name: "Verify Partner",
        email: specificEmail,
        phone: "+919876543211",
        password: "secretpassword123",
      });

      expect(created.ok).toBe(true);
      const correctOtp = created.code!;

      // Wrong OTP
      const wrongAttempt = verifySignupOtp({
        email: specificEmail,
        otp: "000000",
      });
      expect(wrongAttempt.ok).toBe(false);
      expect(wrongAttempt.error).toContain("Invalid OTP");

      // Correct OTP
      const correctAttempt = verifySignupOtp({
        email: specificEmail,
        otp: correctOtp,
      });
      expect(correctAttempt.ok).toBe(true);
      expect(correctAttempt.data?.name).toBe("Verify Partner");
      expect(correctAttempt.data?.phone).toBe("+919876543211");

      // Once verified and consumed, subsequent verify fails
      const repeatAttempt = verifySignupOtp({
        email: specificEmail,
        otp: correctOtp,
      });
      expect(repeatAttempt.ok).toBe(false);
    });
  });

  describe("Withdrawal OTP flow", () => {
    const testUserId = "user-test-wd-123";

    it("creates a withdrawal OTP and verifies correctly", async () => {
      const created = await createWithdrawalOtp({
        userId: testUserId,
        email: "withdrawer@earnkaro.test",
        amountPaise: 50000,
        upiId: "withdrawer@oksbi",
        accountHolder: "Earn Partner",
      });

      expect(created.ok).toBe(true);
      expect(created.code).toMatch(/^\d{6}$/);

      // Verify OTP
      const verified = verifyWithdrawalOtp({
        userId: testUserId,
        otp: created.code!,
      });

      expect(verified.ok).toBe(true);
      expect(verified.data?.amountPaise).toBe(50000);
      expect(verified.data?.upiId).toBe("withdrawer@oksbi");
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { POST as sendOtpHandler } from "../app/api/auth/send-otp/route";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { POST as verifyOtpHandler } from "../app/api/auth/verify-otp/route";

describe("Web Login Authentication & OTP Flow", () => {
  it("sends OTP for valid mobile number and returns demoOtp in non-production", async () => {
    const req = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "9876543219" }),
    });

    const res = await sendOtpHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.demoOtp).toBeDefined();
    expect(data.demoOtp).toMatch(/^\d{6}$/);
    expect(data.resendAfterSeconds).toBe(60);
  });

  it("enforces rate-limit (429) on rapid resend of OTP", async () => {
    const targetPhone = "9876543218";

    // First request
    const req1 = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: targetPhone }),
    });
    const res1 = await sendOtpHandler(req1);
    expect(res1.status).toBe(200);

    // Immediate second request
    const req2 = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: targetPhone }),
    });
    const res2 = await sendOtpHandler(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(429);
    expect(data2.error).toContain("Please wait");
    expect(data2.resendAfterSeconds).toBeGreaterThan(0);
  });

  it("logs in successfully via OTP in /api/auth/login with test OTP 123456", async () => {
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "9876543217",
        otp: "123456",
      }),
    });

    const res = await loginHandler(loginReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.phone).toBe("+919876543217");
  });

  it("verifies OTP via /api/auth/verify-otp endpoint", async () => {
    const testEmail = "partner_test_verify@kamai.local";
    const verifyReq = new Request("http://localhost:3000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: testEmail,
        otp: "123456",
      }),
    });

    const res = await verifyOtpHandler(verifyReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
  });

  it("supports direct password login alongside OTP", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@earnkaro.com",
        password: "admin123456",
      }),
    });

    const res = await loginHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("admin@earnkaro.com");
    expect(data.user.role).toBe("ADMIN");
  });

  it("rejects invalid OTP with 400 error", async () => {
    // Send OTP first
    const email = "invalid_otp_test@kamai.local";
    await sendOtpHandler(
      new Request("http://localhost:3000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      })
    );

    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: email,
        otp: "000000",
      }),
    });

    const res = await loginHandler(loginReq);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid");
  });
});

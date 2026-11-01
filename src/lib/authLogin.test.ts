import { describe, it, expect } from "vitest";
import { POST as sendOtpHandler } from "../app/api/auth/send-otp/route";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { POST as verifyOtpHandler } from "../app/api/auth/verify-otp/route";

describe("Web Login Authentication & Email OTP Flow", () => {
  it("sends Email OTP for valid email and returns demoOtp in non-production", async () => {
    const req = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "newpartner@kamai.local" }),
    });

    const res = await sendOtpHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.demoOtp).toBeDefined();
    expect(data.demoOtp).toMatch(/^\d{6}$/);
    expect(data.resendAfterSeconds).toBe(60);
    expect(data.message).toContain("support@kamaikaro.in");
  });

  it("enforces rate-limit (429) on rapid resend of Email OTP", async () => {
    const targetEmail = "ratelimit_test@kamai.local";

    // First request
    const req1 = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const res1 = await sendOtpHandler(req1);
    expect(res1.status).toBe(200);

    // Immediate second request
    const req2 = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const res2 = await sendOtpHandler(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(429);
    expect(data2.error).toContain("Please wait");
    expect(data2.resendAfterSeconds).toBeGreaterThan(0);
  });

  it("rejects invalid email formats with 400", async () => {
    const req = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email-address" }),
    });

    const res = await sendOtpHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("valid email");
  });

  it("logs in successfully via Email OTP in /api/auth/login with test OTP 123456", async () => {
    const testEmail = "otpuser@kamai.local";
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        otp: "123456",
      }),
    });

    const res = await loginHandler(loginReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
  });

  it("verifies Email OTP via /api/auth/verify-otp endpoint", async () => {
    const testEmail = "partner_test_verify@kamai.local";
    const verifyReq = new Request("http://localhost:3000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
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
    const email = "invalid_otp_test@kamai.local";
    await sendOtpHandler(
      new Request("http://localhost:3000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    );

    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp: "000000",
      }),
    });

    const res = await loginHandler(loginReq);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid");
  });
});

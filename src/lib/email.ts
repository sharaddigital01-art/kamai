import { isSupabaseConfigured } from "./mockData";
import { createSupabaseServer } from "./supabase/server";

export interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendOtpEmailParams {
  toEmail: string;
  toName?: string;
  otpCode: string;
  type: "login" | "signup" | "withdrawal" | "password_reset";
  amountFormatted?: string;
  upiId?: string;
}

const SENDER_EMAIL = "support@kamaikaro.in";
const SENDER_NAME = "Kamai Karo";

/**
 * Sends a real transactional email via Brevo REST API v3
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 */
export async function sendBrevoEmail(
  params: SendEmailParams
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey =
    process.env.BREVO_API_KEY ||
    process.env.SENDINBLUE_API_KEY ||
    process.env.BREVO_KEY;

  if (!apiKey) {
    console.warn(
      `[Brevo Service Notice] BREVO_API_KEY is not set. Transactional email to ${params.toEmail} simulated in non-production.`
    );
    return { ok: false, error: "BREVO_API_KEY_NOT_CONFIGURED" };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [
          {
            email: params.toEmail.trim().toLowerCase(),
            name: params.toName?.trim() || "Kamai Partner",
          },
        ],
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent || params.subject,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[Brevo API Error]", res.status, data);
      return {
        ok: false,
        error: data?.message || `Brevo API rejected request with status ${res.status}`,
      };
    }

    console.log(`[Brevo Email Sent] MessageId: ${data?.messageId} to ${params.toEmail}`);
    return { ok: true, messageId: data?.messageId };
  } catch (err: any) {
    console.error("[Brevo Request Exception]:", err?.message || err);
    return { ok: false, error: err?.message || "Brevo network error" };
  }
}

/**
 * Sends branded OTP email for Login, Signup, or Payout/Withdrawal.
 */
export async function sendOtpEmail(
  params: SendOtpEmailParams
): Promise<{ ok: boolean; brevoMessageId?: string }> {
  const { toEmail, toName, otpCode, type, amountFormatted, upiId } = params;
  const cleanEmail = toEmail.trim().toLowerCase();

  let subject = `Your Kamai Karo Login Code: ${otpCode}`;
  let headline = "Your One-Time Login Code";
  let explanation =
    "Use the verification code below to securely log in to your Kamai Karo partner account.";

  if (type === "signup") {
    subject = `Verify Your Kamai Karo Account: ${otpCode}`;
    headline = "Welcome to Kamai Karo!";
    explanation =
      "Thank you for registering. Use the 6-digit verification code below to activate your account and start earning.";
  } else if (type === "withdrawal") {
    subject = `Confirm Payout Request of ${amountFormatted || "Funds"} - Kamai Karo: ${otpCode}`;
    headline = "Authorize Withdrawal Request";
    explanation = `A payout request for <strong>${amountFormatted || "your funds"}</strong> to UPI ID <strong>${
      upiId || "your UPI"
    }</strong> has been initiated. Enter this code to confirm and process your transfer.`;
  } else if (type === "password_reset") {
    subject = `Reset Your Kamai Karo Password: ${otpCode}`;
    headline = "Reset Your Account Password";
    explanation =
      "Use the 6-digit verification code below to securely reset your Kamai Karo account password. If you did not request this change, you can safely ignore this email.";
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F6F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #134024 0%, #169443 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Kamai Karo</h1>
              <p style="color: #A7F3D0; margin: 4px 0 0 0; font-size: 13px; font-weight: 500;">India's Premier Deal & Affiliate Platform</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">${headline}</h2>
              <p style="color: #4B5563; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
                Hello ${toName || "Partner"},<br><br>
                ${explanation}
              </p>
              
              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #F0FDF4; border: 2px dashed #169443; border-radius: 16px; padding: 18px;">
                    <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #134024; font-family: 'Courier New', Courier, monospace;">
                      ${otpCode}
                    </div>
                    <div style="color: #059669; font-size: 12px; font-weight: 600; margin-top: 6px;">
                      Valid for 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              ${
                type === "withdrawal"
                  ? `<div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px;">
                      <p style="color: #92400E; font-size: 12px; margin: 0; line-height: 1.4;">
                        <strong>Security Alert:</strong> If you did not initiate this withdrawal to <code>${upiId}</code>, please do NOT share this code and report to <a href="mailto:support@kamaikaro.in" style="color: #92400E; font-weight: bold;">support@kamaikaro.in</a> immediately.
                      </p>
                    </div>`
                  : ""
              }

              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0;">
                <strong>Security Notice:</strong> Never share this code with anyone. Kamai Karo staff will never ask for your verification code or password.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 11px; margin: 0; line-height: 1.4;">
                Sent from official domain <strong>support@kamaikaro.in</strong> &bull; &copy; ${new Date().getFullYear()} Kamai Karo. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // 1. Send via Brevo API
  const brevoRes = await sendBrevoEmail({
    toEmail: cleanEmail,
    toName,
    subject,
    htmlContent,
    textContent: `${headline}\n\nYour 6-digit verification code: ${otpCode}\n\nValid for 10 minutes.\nNever share this code with anyone.\n\nKamai Karo Support (support@kamaikaro.in)`,
  });

  return {
    ok: brevoRes.ok,
    brevoMessageId: brevoRes.messageId,
  };
}

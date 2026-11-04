/**
 * Email Service - Demo Mode
 * In Demo mode, Brevo is disabled. Emails are not actually sent.
 * Verification codes are logged to console for testing purposes.
 * The original Brevo code is preserved below for future production use.
 */

/*
// Original Brevo email service - DISABLED IN DEMO MODE

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "nbrasalsma@gmail.com";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "زينة";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not configured - email will not be sent");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: Array.isArray(options.to)
          ? options.to.map(email => ({ email }))
          : [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || options.html.replace(/<[^>]*>/g, ""),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    return { success: false, error: "Failed to connect to email service" };
  }
}
*/

// Demo mode: simulate email sending without external dependency
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  console.log("[Demo Email] Simulated email sent:", {
    to: options.to,
    subject: options.subject,
  });
  return { success: true, messageId: `demo-${Date.now()}` };
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  name: string
): Promise<SendResult> {
  console.log(`[Demo Verification Email] Code for ${email}: ${code}`);
  return sendEmail({
    to: email,
    subject: `زينة - كود التحقق: ${code}`,
    html: `<p>مرحباً ${name}! كود التحقق الخاص بك هو: <strong>${code}</strong></p>`,
    text: `مرحباً ${name}! كود التحقق الخاص بك هو: ${code}`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  code: string,
  name: string
): Promise<SendResult> {
  console.log(`[Demo Password Reset Email] Code for ${email}: ${code}`);
  return sendEmail({
    to: email,
    subject: `زينة - إعادة تعيين كلمة المرور`,
    html: `<p>مرحباً ${name}! كود إعادة التعيين هو: <strong>${code}</strong></p>`,
    text: `مرحباً ${name}! كود إعادة التعيين هو: ${code}`,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<SendResult> {
  console.log(`[Demo Welcome Email] Welcome ${name} to ${email}`);
  return sendEmail({
    to: email,
    subject: `🎉 مرحباً بك في زينة!`,
    html: `<p>أهلاً وسهلاً ${name}! تم تفعيل حسابك التجريبي بنجاح!</p>`,
  });
}

import nodemailer from "nodemailer";
import { env } from "../config/env.js";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

function getTransport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transport = getTransport();

  if (!transport) {
    // Dev fallback: no SMTP configured, log instead of sending.
    console.log("📧 [email:dev] To:", options.to);
    console.log("📧 [email:dev] Subject:", options.subject);
    console.log("📧 [email:dev] Body:\n" + options.text);
    for (const att of options.attachments ?? []) {
      console.log(
        `📧 [email:dev] Attachment: ${att.filename} (${(att.content.length / 1024).toFixed(1)} KB)`
      );
    }
    return;
  }

  await transport.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your password",
    text: `You requested a password reset.\n\nOpen this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>You requested a password reset. Click the button below to set a new password. This link is valid for 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#AF6278;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset password</a>
        </p>
        <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

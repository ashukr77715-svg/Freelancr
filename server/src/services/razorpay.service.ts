import crypto from "node:crypto";
import { env } from "../config/env.js";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  const creds = Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");
  return `Basic ${creds}`;
}

export interface PaymentLinkResult {
  id: string;
  shortUrl: string;
}

/**
 * Creates a Razorpay Payment Link for an invoice. The client pays via the
 * hosted link (no login needed); the webhook confirms capture.
 */
/**
 * Razorpay requires contact as 8-14 digits (optionally +country) and rejects
 * placeholder numbers where every digit repeats (e.g. 9999999999).
 */
function sanitizePhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,14}$/.test(cleaned)) return undefined;
  const national = cleaned.replace(/^\+?91/, "").replace(/^\+/, "");
  if (/^(\d)\1+$/.test(national)) return undefined;
  return cleaned;
}

export async function createPaymentLink(input: {
  amountInr: number; // rupees
  description: string;
  referenceId: string; // invoice number (unique per user, may repeat across users) + id
  customer: { name: string; email?: string | null; phone?: string | null };
  notes: Record<string, string>;
}): Promise<PaymentLinkResult> {
  const request = async (contact: string | undefined) => {
    return fetch(`${RAZORPAY_API}/payment_links`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(input.amountInr * 100), // paise
        currency: "INR",
        description: input.description,
        reference_id: input.referenceId,
        customer: {
          name: input.customer.name,
          email: input.customer.email || undefined,
          contact,
        },
        notify: { sms: false, email: false }, // we send our own email
        notes: input.notes,
      }),
    });
  };

  const contact = sanitizePhone(input.customer.phone);
  let res = await request(contact);

  // If Razorpay still dislikes the contact number, the link matters more than
  // the phone — retry once without it.
  if (!res.ok && res.status === 400 && contact) {
    const body = await res.text();
    if (/contact/i.test(body)) {
      res = await request(undefined);
    } else {
      throw new Error(`Razorpay payment link creation failed (400): ${body}`);
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay payment link creation failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string; short_url: string };
  return { id: data.id, shortUrl: data.short_url };
}

/**
 * Verifies the X-Razorpay-Signature header: HMAC-SHA256 of the raw request
 * body using the webhook secret. Mandatory — never process unsigned events.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

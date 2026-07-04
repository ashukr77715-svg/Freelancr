import { Router, raw } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyWebhookSignature } from "../services/razorpay.service.js";
import { logActivity } from "../services/activity.service.js";
import { formatINR } from "../services/pdf.service.js";

const router = Router();

interface RazorpayPaymentEntity {
  id: string;
  order_id?: string;
  amount: number; // paise
  currency: string;
  method?: string;
  notes?: Record<string, string>;
}

/**
 * Razorpay webhook. Mounted with express.raw() BEFORE the global JSON parser
 * so the signature is verified against the exact raw bytes.
 */
router.post(
  "/razorpay",
  raw({ type: "*/*" }),
  asyncHandler(async (req, res) => {
    const signature = req.get("x-razorpay-signature") ?? "";
    const rawBody = req.body as Buffer;

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("Razorpay webhook: invalid signature — rejected");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody.toString("utf8")) as {
      event: string;
      payload?: { payment?: { entity?: RazorpayPaymentEntity } };
    };

    if (event.event !== "payment.captured") {
      // Acknowledge everything else so Razorpay doesn't retry.
      return res.json({ ok: true, ignored: event.event });
    }

    const payment = event.payload?.payment?.entity;

    // Plan-upgrade payments activate the subscription instead of an invoice.
    if (payment?.notes?.type === "plan_upgrade") {
      const { orderId, userId: buyerId } = payment.notes;
      if (orderId && buyerId) {
        const order = await prisma.planOrder.findFirst({
          where: { id: orderId, userId: buyerId, status: "CREATED" },
        });
        if (order) {
          await prisma.planOrder.update({
            where: { id: order.id },
            data: { status: "CAPTURED", paidAt: new Date() },
          });
          const { activatePlan } = await import("../services/billing.service.js");
          await activatePlan(buyerId, order.plan, order.cycle);
        }
      }
      return res.json({ ok: true });
    }

    const invoiceId = payment?.notes?.invoiceId;
    const userId = payment?.notes?.userId;
    if (!payment || !invoiceId || !userId) {
      console.warn("Razorpay webhook: payment.captured without invoice notes");
      return res.json({ ok: true, ignored: "missing notes" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });
    if (!invoice) {
      console.warn(`Razorpay webhook: invoice ${invoiceId} not found`);
      return res.json({ ok: true, ignored: "unknown invoice" });
    }

    // Idempotent: webhooks can be delivered more than once.
    const existing = await prisma.payment.findUnique({
      where: { razorpayPaymentId: payment.id },
    });
    if (existing) return res.json({ ok: true, duplicate: true });

    const paidAt = new Date();
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          userId,
          invoiceId,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          amount: payment.amount / 100,
          currency: payment.currency,
          method: payment.method,
          status: "CAPTURED",
          paidAt,
          rawPayload: event as object,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt },
      }),
    ]);

    await logActivity({
      userId,
      type: "invoice.paid",
      entityType: "invoice",
      entityId: invoiceId,
      message: `Invoice ${invoice.invoiceNumber} paid online (${formatINR(payment.amount / 100)})`,
    });

    res.json({ ok: true });
  })
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/errors.js";
import { logActivity } from "../services/activity.service.js";
import {
  addMonths,
  computeTotals,
  invoiceInclude,
  materializeRecurring,
  nextInvoiceNumber,
  refreshOverdue,
} from "../services/invoice.service.js";
import { generateInvoicePdf } from "../services/pdf.service.js";
import { formatMoney } from "../utils/money.js";
import { createPaymentLink, isRazorpayConfigured } from "../services/razorpay.service.js";
import { sendEmail } from "../services/email.service.js";
import { assertWithinLimit, planAllowsPaymentLinks } from "../services/billing.service.js";

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required").max(500),
  quantity: z.coerce.number().positive("Quantity must be positive").max(100000),
  rate: z.coerce.number().min(0).max(100000000),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  currency: z.enum(["INR", "USD", "EUR", "AED"]).default("INR"),
  gstType: z.enum(["NONE", "CGST_SGST", "IGST"]).default("NONE"),
  gstRate: z.coerce.number().min(0).max(28).default(0),
  clientGstin: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional().nullable(),
  items: z.array(itemSchema).min(1, "Add at least one line item").max(50),
});

const INTERVAL_MONTHS = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 } as const;

async function getOwnedInvoice(userId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: invoiceInclude,
  });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return invoice;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    await materializeRecurring(req.userId!);
    await refreshOverdue(req.userId!);
    const status = req.query.status;
    const where: Prisma.InvoiceWhereInput = { userId: req.userId! };
    if (
      typeof status === "string" &&
      ["DRAFT", "SENT", "PAID", "OVERDUE"].includes(status)
    ) {
      where.status = status as "DRAFT" | "SENT" | "PAID" | "OVERDUE";
    }
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true, company: true } } },
    });
    res.json({ invoices, razorpayConfigured: isRazorpayConfigured() });
  })
);

router.post(
  "/",
  validateBody(invoiceSchema),
  asyncHandler(async (req, res) => {
    await assertWithinLimit(req.userId!, "invoices");
    const client = await prisma.client.findFirst({
      where: { id: req.body.clientId, userId: req.userId! },
    });
    if (!client) throw ApiError.badRequest("Client not found");

    const totals = computeTotals(req.body.items, req.body.gstType, req.body.gstRate);
    const issueDate = req.body.issueDate ?? new Date();
    const recurring = req.body.isRecurring && req.body.recurringInterval;

    // Retry on invoice-number collision (concurrent creates).
    let invoice = null;
    for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
      const invoiceNumber = await nextInvoiceNumber(req.userId!);
      try {
        invoice = await prisma.invoice.create({
          data: {
            userId: req.userId!,
            clientId: client.id,
            invoiceNumber,
            issueDate,
            dueDate: req.body.dueDate,
            currency: req.body.currency,
            isRecurring: Boolean(recurring),
            recurringInterval: recurring ? req.body.recurringInterval : null,
            nextRecurringDate: recurring
              ? addMonths(
                  issueDate,
                  INTERVAL_MONTHS[req.body.recurringInterval as keyof typeof INTERVAL_MONTHS]
                )
              : null,
            gstType: req.body.gstType,
            gstRate: req.body.gstRate,
            clientGstin: req.body.clientGstin,
            notes: req.body.notes,
            subtotal: totals.subtotal,
            cgstAmount: totals.cgstAmount,
            sgstAmount: totals.sgstAmount,
            igstAmount: totals.igstAmount,
            total: totals.total,
            items: {
              create: totals.items.map((item, i) => ({
                userId: req.userId!,
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.amount,
                sortOrder: i,
              })),
            },
          },
          include: invoiceInclude,
        });
      } catch (err) {
        if (
          !(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
        ) {
          throw err;
        }
      }
    }
    if (!invoice) throw ApiError.conflict("Could not allocate an invoice number, retry");

    await logActivity({
      userId: req.userId!,
      type: "invoice.created",
      entityType: "invoice",
      entityId: invoice.id,
      message: `Invoice ${invoice.invoiceNumber} created for ${client.name} (${formatMoney(totals.total, req.body.currency)})`,
    });
    res.status(201).json({ invoice });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await refreshOverdue(req.userId!);
    const invoice = await getOwnedInvoice(req.userId!, req.params.id);
    res.json({ invoice, razorpayConfigured: isRazorpayConfigured() });
  })
);

const INTERVALS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;

router.put(
  "/:id",
  validateBody(invoiceSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await getOwnedInvoice(req.userId!, req.params.id);
    if (existing.status === "PAID") {
      throw ApiError.badRequest("Paid invoices cannot be edited");
    }

    const items = req.body.items;
    const gstType = req.body.gstType ?? existing.gstType;
    const gstRate = req.body.gstRate ?? Number(existing.gstRate);

    const totals = computeTotals(
      items ??
        existing.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
        })),
      gstType,
      gstRate
    );

    const wantsRecurring =
      req.body.isRecurring !== undefined
        ? req.body.isRecurring && (req.body.recurringInterval ?? existing.recurringInterval)
        : undefined;
    const interval =
      req.body.recurringInterval ?? existing.recurringInterval ?? "MONTHLY";
    const baseIssue = req.body.issueDate ?? existing.issueDate;

    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        clientId: req.body.clientId,
        issueDate: req.body.issueDate,
        dueDate: req.body.dueDate,
        currency: req.body.currency,
        ...(wantsRecurring !== undefined
          ? {
              isRecurring: Boolean(wantsRecurring),
              recurringInterval: wantsRecurring
                ? (interval as (typeof INTERVALS)[number])
                : null,
              nextRecurringDate: wantsRecurring
                ? existing.nextRecurringDate ??
                  addMonths(baseIssue, INTERVAL_MONTHS[interval as keyof typeof INTERVAL_MONTHS])
                : null,
            }
          : {}),
        gstType,
        gstRate,
        clientGstin: req.body.clientGstin,
        notes: req.body.notes,
        subtotal: totals.subtotal,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        total: totals.total,
        ...(items
          ? {
              items: {
                deleteMany: {},
                create: totals.items.map((item, i) => ({
                  userId: req.userId!,
                  description: item.description,
                  quantity: item.quantity,
                  rate: item.rate,
                  amount: item.amount,
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      include: invoiceInclude,
    });
    res.json({ invoice });
  })
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const invoice = await getOwnedInvoice(req.userId!, req.params.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const pdf = await generateInvoicePdf(invoice, invoice.client, user);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );
    res.send(Buffer.from(pdf));
  })
);

// Send to client: create Razorpay payment link (if configured), email PDF + link.
router.post(
  "/:id/send",
  asyncHandler(async (req, res) => {
    const invoice = await getOwnedInvoice(req.userId!, req.params.id);
    if (invoice.status === "PAID") {
      throw ApiError.badRequest("Invoice is already paid");
    }
    if (!invoice.client.email) {
      throw ApiError.badRequest("Client has no email address — add one first");
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const businessName = user.businessName || user.name;

    let paymentLinkUrl = invoice.paymentLinkUrl;
    let paymentLinkId = invoice.paymentLinkId;
    // Payment links: Pro+ plans only, Razorpay configured, INR invoices.
    const allowLinks = await planAllowsPaymentLinks(req.userId!);
    if (allowLinks && isRazorpayConfigured() && !paymentLinkUrl && invoice.currency === "INR") {
      const link = await createPaymentLink({
        amountInr: Number(invoice.total),
        description: `${invoice.invoiceNumber} from ${businessName}`,
        referenceId: invoice.id,
        customer: {
          name: invoice.client.name,
          email: invoice.client.email,
          phone: invoice.client.phone,
        },
        notes: { invoiceId: invoice.id, userId: user.id },
      });
      paymentLinkUrl = link.shortUrl;
      paymentLinkId = link.id;
    }

    const pdf = await generateInvoicePdf(invoice, invoice.client, user);

    const amount = formatMoney(Number(invoice.total), invoice.currency);
    const payLine = paymentLinkUrl
      ? `\n\nPay online: ${paymentLinkUrl}`
      : "";
    await sendEmail({
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${businessName} — ${amount}`,
      text: `Hi ${invoice.client.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for ${amount}${invoice.dueDate ? `, due by ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}` : ""}.${payLine}\n\nThank you,\n${businessName}`,
      html: `<p>Hi ${invoice.client.name},</p><p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${amount}</strong>${invoice.dueDate ? `, due by ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}` : ""}.</p>${paymentLinkUrl ? `<p><a href="${paymentLinkUrl}" style="background:#AF6278;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Pay ${amount}</a></p>` : ""}<p>Thank you,<br/>${businessName}</p>`,
      attachments: [
        { filename: `${invoice.invoiceNumber}.pdf`, content: Buffer.from(pdf) },
      ],
    });

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: invoice.status === "OVERDUE" ? "OVERDUE" : "SENT",
        sentAt: new Date(),
        paymentLinkUrl,
        paymentLinkId,
      },
      include: invoiceInclude,
    });

    await logActivity({
      userId: req.userId!,
      type: "invoice.sent",
      entityType: "invoice",
      entityId: invoice.id,
      message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.client.name}`,
    });

    res.json({
      invoice: updated,
      paymentLinkCreated: Boolean(paymentLinkUrl),
      razorpayConfigured: isRazorpayConfigured(),
      planAllowsPaymentLinks: allowLinks,
    });
  })
);

// Manual "mark as paid" for offline payments (UPI/bank transfer/cash).
router.post(
  "/:id/mark-paid",
  asyncHandler(async (req, res) => {
    const invoice = await getOwnedInvoice(req.userId!, req.params.id);
    if (invoice.status === "PAID") {
      throw ApiError.badRequest("Invoice is already paid");
    }

    const [updated] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paidAt: new Date() },
        include: invoiceInclude,
      }),
      prisma.payment.create({
        data: {
          userId: req.userId!,
          invoiceId: invoice.id,
          amount: invoice.total,
          currency: invoice.currency,
          method: "manual",
          status: "CAPTURED",
          paidAt: new Date(),
        },
      }),
    ]);

    await logActivity({
      userId: req.userId!,
      type: "invoice.paid",
      entityType: "invoice",
      entityId: invoice.id,
      message: `Invoice ${invoice.invoiceNumber} marked as paid (${formatMoney(Number(invoice.total), invoice.currency)})`,
    });
    res.json({ invoice: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await getOwnedInvoice(req.userId!, req.params.id);
    if (invoice.status === "PAID") {
      throw ApiError.badRequest("Paid invoices cannot be deleted");
    }
    await prisma.invoice.delete({ where: { id: invoice.id } });
    res.json({ ok: true });
  })
);

export default router;

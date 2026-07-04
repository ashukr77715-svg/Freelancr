import { Prisma, type RecurringInterval } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  rate: number;
}

export interface InvoiceTotals {
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
  items: Array<InvoiceItemInput & { amount: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotals(
  items: InvoiceItemInput[],
  gstType: "NONE" | "CGST_SGST" | "IGST",
  gstRate: number
): InvoiceTotals {
  const withAmounts = items.map((item, i) => ({
    ...item,
    amount: round2(item.quantity * item.rate),
    sortOrder: i,
  }));
  const subtotal = round2(withAmounts.reduce((sum, i) => sum + i.amount, 0));
  const gstAmount = gstType === "NONE" ? 0 : round2((subtotal * gstRate) / 100);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (gstType === "CGST_SGST") {
    cgstAmount = round2(gstAmount / 2);
    sgstAmount = round2(gstAmount - cgstAmount);
  } else if (gstType === "IGST") {
    igstAmount = gstAmount;
  }

  return {
    subtotal,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total: round2(subtotal + cgstAmount + sgstAmount + igstAmount),
    items: withAmounts,
  };
}

export async function nextInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { userId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const lastSeq = last ? Number(last.invoiceNumber.slice(prefix.length)) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/** Flips SENT invoices past their due date to OVERDUE. Called before reads. */
export async function refreshOverdue(userId: string): Promise<void> {
  await prisma.invoice.updateMany({
    where: { userId, status: "SENT", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });
}

const INTERVAL_MONTHS: Record<RecurringInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Clamp month-end overflow (e.g. Jan 31 + 1 month → Feb 28, not Mar 3).
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

/**
 * Generates due drafts for recurring invoices ("lazy cron": runs before
 * invoice/dashboard reads instead of a background job). Each generated
 * invoice is a plain draft linked back to the template via parentInvoiceId;
 * the template's nextRecurringDate advances by the interval. Caps catch-up
 * at 12 periods per template as a runaway guard.
 */
export async function materializeRecurring(userId: string): Promise<void> {
  const now = new Date();
  const templates = await prisma.invoice.findMany({
    where: {
      userId,
      isRecurring: true,
      recurringInterval: { not: null },
      nextRecurringDate: { lte: now },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  for (const template of templates) {
    const months = INTERVAL_MONTHS[template.recurringInterval!];
    let nextDate = template.nextRecurringDate!;
    let generated = 0;

    while (nextDate <= now && generated < 12) {
      const invoiceNumber = await nextInvoiceNumber(userId);
      const dueOffsetMs = template.dueDate
        ? template.dueDate.getTime() - template.issueDate.getTime()
        : null;

      await prisma.invoice.create({
        data: {
          userId,
          clientId: template.clientId,
          invoiceNumber,
          status: "DRAFT",
          issueDate: nextDate,
          dueDate: dueOffsetMs !== null ? new Date(nextDate.getTime() + dueOffsetMs) : null,
          currency: template.currency,
          subtotal: template.subtotal,
          gstType: template.gstType,
          gstRate: template.gstRate,
          cgstAmount: template.cgstAmount,
          sgstAmount: template.sgstAmount,
          igstAmount: template.igstAmount,
          total: template.total,
          notes: template.notes,
          clientGstin: template.clientGstin,
          parentInvoiceId: template.id,
          items: {
            create: template.items.map((item, i) => ({
              userId,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              sortOrder: i,
            })),
          },
        },
      });

      await logActivity({
        userId,
        type: "invoice.recurring",
        entityType: "invoice",
        entityId: template.id,
        message: `Recurring invoice ${invoiceNumber} generated from ${template.invoiceNumber}`,
      });

      nextDate = addMonths(nextDate, months);
      generated++;
    }

    await prisma.invoice.update({
      where: { id: template.id },
      data: { nextRecurringDate: nextDate },
    });
  }
}

export const invoiceInclude = {
  client: { select: { id: true, name: true, company: true, email: true, phone: true, address: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.InvoiceInclude;

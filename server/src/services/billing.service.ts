import type { BillingCycle, Plan } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/errors.js";
import { logActivity } from "./activity.service.js";
import { env } from "../config/env.js";

export interface PlanLimits {
  clients: number | null; // null = unlimited
  proposalsPerMonth: number | null;
  invoicesPerMonth: number | null;
  paymentLinks: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  STARTER: {
    clients: 3,
    proposalsPerMonth: 5,
    invoicesPerMonth: 5,
    paymentLinks: false,
  },
  PRO: {
    clients: null,
    proposalsPerMonth: 50,
    invoicesPerMonth: null,
    paymentLinks: true,
  },
  AGENCY: {
    clients: null,
    proposalsPerMonth: null,
    invoicesPerMonth: null,
    paymentLinks: true,
  },
};

// Rupees. Yearly = discounted per-month rate × 12, charged upfront.
export const PLAN_PRICES: Record<Exclude<Plan, "STARTER">, Record<BillingCycle, number>> = {
  PRO: { MONTHLY: 499, YEARLY: 399 * 12 },
  AGENCY: { MONTHLY: 1499, YEARLY: 1199 * 12 },
};

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getUsage(userId: string) {
  const [clients, proposalsThisMonth, invoicesThisMonth] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.proposal.count({ where: { userId, createdAt: { gte: startOfMonth() } } }),
    prisma.invoice.count({
      where: { userId, createdAt: { gte: startOfMonth() }, parentInvoiceId: null },
    }),
  ]);
  return { clients, proposalsThisMonth, invoicesThisMonth };
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true },
  });
  return user.plan;
}

/** Throws a 403 PLAN_LIMIT error when the metric is at/over the plan cap. */
export async function assertWithinLimit(
  userId: string,
  metric: "clients" | "proposals" | "invoices"
): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const usage = await getUsage(userId);

  const checks = {
    clients: {
      limit: limits.clients,
      current: usage.clients,
      message: (limit: number) =>
        `Your ${plan.toLowerCase()} plan allows up to ${limit} clients. Upgrade to Pro for unlimited clients.`,
    },
    proposals: {
      limit: limits.proposalsPerMonth,
      current: usage.proposalsThisMonth,
      message: (limit: number) =>
        `Your ${plan.toLowerCase()} plan allows ${limit} AI proposals per month. Upgrade for more.`,
    },
    invoices: {
      limit: limits.invoicesPerMonth,
      current: usage.invoicesThisMonth,
      message: (limit: number) =>
        `Your ${plan.toLowerCase()} plan allows ${limit} invoices per month. Upgrade to Pro for unlimited invoices.`,
    },
  } as const;

  const check = checks[metric];
  if (check.limit !== null && check.current >= check.limit) {
    throw new ApiError(403, check.message(check.limit), "PLAN_LIMIT");
  }
}

export async function planAllowsPaymentLinks(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return PLAN_LIMITS[plan].paymentLinks;
}

export async function activatePlan(
  userId: string,
  plan: Plan,
  cycle: BillingCycle
): Promise<void> {
  const now = new Date();
  const renews = new Date(now);
  if (cycle === "YEARLY") renews.setFullYear(renews.getFullYear() + 1);
  else renews.setMonth(renews.getMonth() + 1);

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      planCycle: cycle,
      planActivatedAt: now,
      planRenewsAt: renews,
    },
  });
  await logActivity({
    userId,
    type: "plan.upgraded",
    message: `Upgraded to ${plan} (${cycle.toLowerCase()})`,
  });
}

/** Checks a plan order's Razorpay payment link; activates the plan if paid. */
export async function verifyAndActivateOrder(userId: string, orderId: string) {
  const order = await prisma.planOrder.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status === "CAPTURED") {
    return { activated: true, alreadyActive: true };
  }
  if (!order.razorpayLinkId) throw ApiError.badRequest("Order has no payment link");

  const creds = Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");
  const res = await fetch(
    `https://api.razorpay.com/v1/payment_links/${order.razorpayLinkId}`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  if (!res.ok) {
    throw new ApiError(502, "Could not check payment status — try again.");
  }
  const link = (await res.json()) as { status: string };

  if (link.status !== "paid") {
    return { activated: false, linkStatus: link.status };
  }

  await prisma.planOrder.update({
    where: { id: order.id },
    data: { status: "CAPTURED", paidAt: new Date() },
  });
  await activatePlan(userId, order.plan, order.cycle);
  return { activated: true };
}

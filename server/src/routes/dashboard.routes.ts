import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { materializeRecurring, refreshOverdue } from "../services/invoice.service.js";

const router = Router();
router.use(requireAuth);

interface CurrencyAmount {
  currency: string;
  amount: number;
}

function toCurrencyAmounts(
  groups: Array<{ currency: string; _sum: { amount?: unknown; total?: unknown } }>
): CurrencyAmount[] {
  return groups
    .map((g) => ({
      currency: g.currency,
      amount: Number(g._sum.amount ?? g._sum.total ?? 0),
    }))
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    await materializeRecurring(userId);
    await refreshOverdue(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      revenueThisMonth,
      revenueAllTime,
      pendingAgg,
      pendingCount,
      activeClients,
      proposalsThisMonth,
      recentPayments,
      activity,
    ] = await Promise.all([
      prisma.payment.groupBy({
        by: ["currency"],
        where: { userId, status: "CAPTURED", paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: { userId, status: "CAPTURED" },
        _sum: { amount: true },
      }),
      prisma.invoice.groupBy({
        by: ["currency"],
        where: { userId, status: { in: ["SENT", "OVERDUE"] } },
        _sum: { total: true },
      }),
      prisma.invoice.count({
        where: { userId, status: { in: ["SENT", "OVERDUE"] } },
      }),
      prisma.client.count({ where: { userId, status: "ACTIVE" } }),
      prisma.proposal.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
      prisma.payment.findMany({
        where: { userId, status: "CAPTURED", paidAt: { gte: sixMonthsAgo } },
        select: { amount: true, paidAt: true, currency: true },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const allTime = toCurrencyAmounts(revenueAllTime);
    // Chart follows the currency the user earns most in.
    const chartCurrency = allTime[0]?.currency ?? "INR";

    const revenueByMonth: Array<{ month: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueByMonth.push({
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        amount: 0,
      });
    }
    for (const p of recentPayments) {
      if (!p.paidAt || p.currency !== chartCurrency) continue;
      const idx =
        5 -
        ((now.getFullYear() - p.paidAt.getFullYear()) * 12 +
          (now.getMonth() - p.paidAt.getMonth()));
      if (idx >= 0 && idx < 6) revenueByMonth[idx].amount += Number(p.amount);
    }

    res.json({
      revenue: {
        thisMonth: toCurrencyAmounts(revenueThisMonth),
        allTime,
      },
      pendingInvoices: {
        count: pendingCount,
        amounts: toCurrencyAmounts(pendingAgg),
      },
      activeClients,
      proposalsThisMonth,
      chartCurrency,
      revenueByMonth,
      activity,
    });
  })
);

export default router;

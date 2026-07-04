import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/errors.js";
import {
  PLAN_LIMITS,
  PLAN_PRICES,
  getUsage,
  verifyAndActivateOrder,
} from "../services/billing.service.js";
import { createPaymentLink, isRazorpayConfigured } from "../services/razorpay.service.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: { plan: true, planCycle: true, planRenewsAt: true, email: true, name: true },
    });
    const usage = await getUsage(req.userId!);
    const pendingOrder = await prisma.planOrder.findFirst({
      where: { userId: req.userId!, status: "CREATED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, plan: true, cycle: true, amount: true, linkUrl: true, createdAt: true },
    });
    res.json({
      plan: user.plan,
      cycle: user.planCycle,
      renewsAt: user.planRenewsAt,
      limits: PLAN_LIMITS[user.plan],
      usage,
      prices: PLAN_PRICES,
      razorpayConfigured: isRazorpayConfigured(),
      pendingOrder,
    });
  })
);

const upgradeSchema = z.object({
  plan: z.enum(["PRO", "AGENCY"]),
  cycle: z.enum(["MONTHLY", "YEARLY"]),
});

router.post(
  "/upgrade",
  validateBody(upgradeSchema),
  asyncHandler(async (req, res) => {
    if (!isRazorpayConfigured()) {
      throw ApiError.badRequest(
        "Payments are not configured on this server yet (Razorpay keys missing)."
      );
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const { plan, cycle } = req.body as { plan: "PRO" | "AGENCY"; cycle: "MONTHLY" | "YEARLY" };
    if (user.plan === plan && user.planCycle === cycle) {
      throw ApiError.badRequest("You are already on this plan");
    }

    const amount = PLAN_PRICES[plan][cycle];

    const order = await prisma.planOrder.create({
      data: { userId: user.id, plan, cycle, amount },
    });

    const link = await createPaymentLink({
      amountInr: amount,
      description: `freelancr ${plan} plan (${cycle.toLowerCase()}) — ${user.email}`,
      referenceId: order.id,
      customer: { name: user.name, email: user.email, phone: user.phone },
      notes: { type: "plan_upgrade", orderId: order.id, userId: user.id, plan, cycle },
    });

    const updated = await prisma.planOrder.update({
      where: { id: order.id },
      data: { razorpayLinkId: link.id, linkUrl: link.shortUrl },
    });

    res.status(201).json({
      order: {
        id: updated.id,
        plan: updated.plan,
        cycle: updated.cycle,
        amount: Number(updated.amount),
        linkUrl: updated.linkUrl,
      },
    });
  })
);

// Called after the user pays on the Razorpay page ("I've paid" button).
router.post(
  "/verify/:orderId",
  asyncHandler(async (req, res) => {
    const result = await verifyAndActivateOrder(req.userId!, req.params.orderId);
    res.json(result);
  })
);

export default router;

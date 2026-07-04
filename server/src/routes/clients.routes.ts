import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/errors.js";
import { logActivity } from "../services/activity.service.js";
import { assertWithinLimit } from "../services/billing.service.js";

const router = Router();
router.use(requireAuth);

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  company: z.string().trim().max(150).optional().nullable(),
  email: z.string().trim().email("Enter a valid email").max(255).optional().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = req.query.status;

    const where: Prisma.ClientWhereInput = { userId: req.userId! };
    if (status === "ACTIVE" || status === "INACTIVE") where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { proposals: true, invoices: true } } },
    });
    res.json({ clients });
  })
);

router.post(
  "/",
  validateBody(clientSchema),
  asyncHandler(async (req, res) => {
    await assertWithinLimit(req.userId!, "clients");
    const client = await prisma.client.create({
      data: { ...req.body, userId: req.userId! },
    });
    await logActivity({
      userId: req.userId!,
      type: "client.created",
      entityType: "client",
      entityId: client.id,
      message: `Client "${client.name}" added`,
    });
    res.status(201).json({ client });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: {
        proposals: {
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, status: true, createdAt: true },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            currency: true,
            issueDate: true,
            dueDate: true,
          },
        },
      },
    });
    if (!client) throw ApiError.notFound("Client not found");
    res.json({ client });
  })
);

router.put(
  "/:id",
  validateBody(clientSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound("Client not found");

    const client = await prisma.client.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ client });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true, name: true },
    });
    if (!existing) throw ApiError.notFound("Client not found");

    await prisma.client.delete({ where: { id: existing.id } });
    await logActivity({
      userId: req.userId!,
      type: "client.deleted",
      entityType: "client",
      entityId: existing.id,
      message: `Client "${existing.name}" deleted`,
    });
    res.json({ ok: true });
  })
);

export default router;

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/errors.js";
import { logActivity } from "../services/activity.service.js";
import {
  generateProposal,
  isAiConfigured,
  type ProposalContent,
} from "../services/ai.service.js";
import { generateProposalPdf } from "../services/pdf.service.js";
import { generateProposalPptx } from "../services/pptx.service.js";
import { assertWithinLimit } from "../services/billing.service.js";

const router = Router();
router.use(requireAuth);

// Rate limit AI generation per user to control API cost.
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.userId ?? req.ip ?? "anon",
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Generation limit reached (20/hour). Try again later." },
});

const contentSchema = z.object({
  title: z.string().min(1),
  executiveSummary: z.string().default(""),
  scopeOfWork: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  timeline: z
    .array(z.object({ phase: z.string(), duration: z.string(), description: z.string().default("") }))
    .default([]),
  pricing: z
    .array(z.object({ item: z.string(), description: z.string().default(""), amount: z.coerce.number().min(0) }))
    .default([]),
  terms: z.array(z.string()).default([]),
});

const generateSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  brief: z.string().trim().min(20, "Brief should be at least 20 characters").max(5000),
  budgetRange: z.string().trim().max(100).optional(),
  timeline: z.string().trim().max(100).optional(),
  tone: z.enum(["FORMAL", "CASUAL"]).default("FORMAL"),
  language: z.enum(["ENGLISH", "HINGLISH"]).default("ENGLISH"),
});

const saveSchema = generateSchema.extend({
  title: z.string().trim().min(1).max(200),
  content: contentSchema,
  rawOutput: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: contentSchema.optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]).optional(),
});

async function getOwnedClient(userId: string, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
  });
  if (!client) throw ApiError.badRequest("Client not found");
  return client;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const proposals = await prisma.proposal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true, company: true } } },
    });
    res.json({ proposals, aiConfigured: isAiConfigured() });
  })
);

// Generate without saving — user reviews/edits before saving.
router.post(
  "/generate",
  generateLimiter,
  validateBody(generateSchema),
  asyncHandler(async (req, res) => {
    await assertWithinLimit(req.userId!, "proposals");
    const client = await getOwnedClient(req.userId!, req.body.clientId);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: { name: true, businessName: true },
    });

    const result = await generateProposal({
      clientName: client.name,
      clientCompany: client.company,
      businessName: user.businessName || user.name,
      brief: req.body.brief,
      budgetRange: req.body.budgetRange,
      timeline: req.body.timeline,
      tone: req.body.tone,
      language: req.body.language,
    });

    res.json(result);
  })
);

router.post(
  "/",
  validateBody(saveSchema),
  asyncHandler(async (req, res) => {
    await assertWithinLimit(req.userId!, "proposals");
    await getOwnedClient(req.userId!, req.body.clientId);
    const proposal = await prisma.proposal.create({
      data: {
        userId: req.userId!,
        clientId: req.body.clientId,
        title: req.body.title,
        brief: req.body.brief,
        budgetRange: req.body.budgetRange,
        timeline: req.body.timeline,
        tone: req.body.tone,
        language: req.body.language,
        content: req.body.content,
        rawOutput: req.body.rawOutput,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });
    await logActivity({
      userId: req.userId!,
      type: "proposal.created",
      entityType: "proposal",
      entityId: proposal.id,
      message: `Proposal "${proposal.title}" created for ${proposal.client.name}`,
    });
    res.status(201).json({ proposal });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { client: { select: { id: true, name: true, company: true, email: true } } },
    });
    if (!proposal) throw ApiError.notFound("Proposal not found");
    res.json({ proposal, aiConfigured: isAiConfigured() });
  })
);

router.put(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { client: { select: { name: true } } },
    });
    if (!existing) throw ApiError.notFound("Proposal not found");

    const statusChanged = req.body.status && req.body.status !== existing.status;
    const proposal = await prisma.proposal.update({
      where: { id: existing.id },
      data: {
        ...req.body,
        ...(req.body.status === "SENT" && !existing.sentAt
          ? { sentAt: new Date() }
          : {}),
      },
      include: { client: { select: { id: true, name: true, company: true, email: true } } },
    });

    if (statusChanged && req.body.status) {
      const verbs: Record<string, string> = {
        SENT: "sent",
        ACCEPTED: "accepted",
        REJECTED: "rejected",
        DRAFT: "moved to draft",
      };
      const verb = verbs[req.body.status];
      await logActivity({
        userId: req.userId!,
        type: `proposal.${req.body.status!.toLowerCase()}`,
        entityType: "proposal",
        entityId: proposal.id,
        message: `Proposal "${proposal.title}" ${verb}`,
      });
    }
    res.json({ proposal });
  })
);

// Regenerate from the stored brief (optionally tweaked parameters).
router.post(
  "/:id/regenerate",
  generateLimiter,
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { client: true },
    });
    if (!proposal) throw ApiError.notFound("Proposal not found");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: { name: true, businessName: true },
    });

    const result = await generateProposal({
      clientName: proposal.client.name,
      clientCompany: proposal.client.company,
      businessName: user.businessName || user.name,
      brief: proposal.brief,
      budgetRange: proposal.budgetRange ?? undefined,
      timeline: proposal.timeline ?? undefined,
      tone: proposal.tone,
      language: proposal.language,
    });

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        title: result.content.title,
        content: result.content as object,
        rawOutput: result.rawOutput,
      },
      include: { client: { select: { id: true, name: true, company: true, email: true } } },
    });

    res.json({ proposal: updated, usedAi: result.usedAi });
  })
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { client: true },
    });
    if (!proposal || !proposal.content) {
      throw ApiError.notFound("Proposal not found");
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });

    const pdf = await generateProposalPdf(
      {
        title: proposal.title,
        content: proposal.content as unknown as ProposalContent,
        createdAt: proposal.createdAt,
      },
      proposal.client,
      user
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="proposal-${proposal.id}.pdf"`
    );
    res.send(Buffer.from(pdf));
  })
);

// Client-ready presentation deck built from the saved proposal content.
router.get(
  "/:id/pptx",
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { client: true },
    });
    if (!proposal || !proposal.content) {
      throw ApiError.notFound("Proposal not found");
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });

    const pptx = await generateProposalPptx(
      {
        title: proposal.title,
        content: proposal.content as unknown as ProposalContent,
        createdAt: proposal.createdAt,
      },
      proposal.client,
      user
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="proposal-${proposal.id}.pptx"`
    );
    res.send(pptx);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound("Proposal not found");
    await prisma.proposal.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

export default router;

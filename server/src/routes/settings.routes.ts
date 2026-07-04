import path from "node:path";
import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/errors.js";
import { storage } from "../services/storage.service.js";

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  businessName: z.string().trim().max(150).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/, "Enter a valid 15-character GSTIN")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(72),
});

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  businessName: true,
  phone: true,
  address: true,
  gstin: true,
  logoUrl: true,
  plan: true,
  createdAt: true,
} as const;

router.put(
  "/profile",
  validateBody(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: req.body,
      select: publicUserSelect,
    });
    res.json({ user });
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/png", "image/jpeg"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG or JPEG logos are allowed"));
  },
});

router.post(
  "/logo",
  (req, res, next) => {
    upload.single("logo")(req, res, (err) => {
      if (err) return next(ApiError.badRequest(err.message ?? "Upload failed"));
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file uploaded");
    const ext = req.file.mimetype === "image/png" ? ".png" : ".jpg";
    const key = path.posix.join("logos", `${req.userId!}${ext}`);
    const url = await storage.save(key, req.file.buffer);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { logoUrl: url },
      select: publicUserSelect,
    });
    res.json({ user });
  })
);

router.put(
  "/password",
  validateBody(passwordChangeSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) throw ApiError.badRequest("Current password is incorrect");

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Other sessions are logged out; this one keeps its access token until expiry.
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.json({ ok: true, message: "Password updated. Other devices were logged out." });
  })
);

export default router;

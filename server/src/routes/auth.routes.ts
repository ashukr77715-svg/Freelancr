import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/errors.js";
import * as authService from "../services/auth.service.js";
import {
  clearAuthCookies,
  cookieNames,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
  signAccessToken,
} from "../services/token.service.js";
import googleRoutes, { isGoogleConfigured } from "./google.routes.js";

const router = Router();

router.use(googleRoutes);

router.get("/providers", (_req, res) => {
  res.json({ google: isGoogleConfigured() });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // per IP per window on sensitive endpoints
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters"); // bcrypt input limit

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: passwordSchema,
  businessName: z.string().trim().max(150).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

router.post(
  "/signup",
  authLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.signup(req.body);
    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(
      user.id,
      req.get("user-agent") ?? undefined
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user });
  })
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.login(req.body);
    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(
      user.id,
      req.get("user-agent") ?? undefined
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[cookieNames.refresh];
    if (!token) {
      throw ApiError.unauthorized("No refresh token", "NO_REFRESH");
    }
    try {
      const { userId, refreshToken } = await rotateRefreshToken(
        token,
        req.get("user-agent") ?? undefined
      );
      const accessToken = signAccessToken(userId);
      setAuthCookies(res, accessToken, refreshToken);
      res.json({ ok: true });
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[cookieNames.refresh];
    if (token) {
      await revokeRefreshToken(token);
    }
    clearAuthCookies(res);
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.userId!);
    if (!user) {
      clearAuthCookies(res);
      throw ApiError.unauthorized("User no longer exists", "USER_GONE");
    }
    res.json({ user });
  })
);

router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.requestPasswordReset(req.body.email);
    // Always 200 to avoid leaking which emails are registered.
    res.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    res.json({ ok: true, message: "Password updated. You can now log in." });
  })
);

export default router;
